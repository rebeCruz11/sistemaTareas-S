import  express  from "express";
import cookieParser from 'cookie-parser';
//Fix para __direname
import path from 'path';
import {fileURLToPath} from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {methods as authentication} from "./controllers/authentication.controller.js"
import {methods as authorization} from "./middlewares/authorization.js";
import jwt from "jsonwebtoken";
import User from "./models/User.js"; //este es el modelo de usuario
import renderMessage from "./utils/renderMessage.js"; // este es el renderizador de mensajess
import mongoose from "mongoose";
import dotenv from "dotenv";
//Lo que agregue para google
import session from "express-session";
import passport from "passport";
import "./config/passport.js"; 
import * as webauthn from "./controllers/webauthn.controller.js";
import {methods as project} from "./controllers/project.controller.js"
import {methods as task} from "./controllers/task.controller.js";
import * as twofa from "./controllers/twofa.controller.js";
import { enviarCodigoRecuperacion } from "./services/recoveryEmailService.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt"; 
import Project from './models/Project.js';








dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log(" Conectado a MongoDB Atlas"))
.catch(err => console.error(" Error al conectar a MongoDB:", err));


//Server
const app = express();
app.set("port",4000);
app.listen(app.get("port"));
console.log("Servidor corriendo en puerto",app.get("port"));
console.log(`Server is listening at http://localhost:${app.get('port')}`);

//Configuración
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

// Config sesión
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Rutas Google
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);
/*
app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        const user = User.findOne({ email: req.user.email });

        if (!user) {
            return res.redirect("/"); // Por seguridad
        }

        // Si tiene 2FA activado, lo mandamos a la ruta /2fa
        if (user.twoFactorEnabled) {
            // Guardamos en sesión o cookie que el login está "pendiente de 2FA"
            req.session.pending2FA = {
                userId: user._id,
                email: user.email
            };

            return res.redirect("/2fa"); 
        }


        // Crear JWT y enviarlo como cookie
        const token = jwt.sign(
            { user: req.user.user, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );



        res.cookie("jwt", token, { httpOnly: true, path: "/" });
        res.redirect("/admin"); // Redirige al dashboard
    }
);
*/
app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    async (req, res) => { // <-- async
        try {
            const user = await User.findOne({ email: req.user.email }); // <-- await

            if (!user) return res.redirect("/");

            if (user.twoFactorEnabled) {
                req.session.pending2FA = {
                    userId: user._id,
                    email: user.email
                };
                return res.redirect("/2fa"); // ✅ redirige correctamente
            }

            // Si no tiene 2FA, se crea JWT y se manda al admin
            const token = jwt.sign(
                { user: user.user, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRATION }
            );

            res.cookie("jwt", token, { httpOnly: true, path: "/" });
            res.redirect("/admin");
        } catch (err) {
            console.error("Error callback Google:", err);
            res.redirect("/"); // evita mostrar error crudo
        }
    }
);





//Rutas
app.get("/",authorization.soloPublico, (req,res)=> res.sendFile(__dirname + "/pages/login.html"));
app.get("/politicas",authorization.soloPublico, (req,res)=> res.sendFile(__dirname + "/pages/politicas.html"));
app.get("/register",authorization.soloPublico,(req,res)=> res.sendFile(__dirname + "/pages/register.html"));
app.get("/admin",authorization.soloAdmin,(req,res)=> res.sendFile(__dirname + "/pages/admin/admin.html"));
// server.js
app.post("/api/login",authentication.login);
app.post("/api/loginPasskey",authentication.loginPasskey);
app.post("/api/register",authentication.register);
app.post("/api/logout", (req, res) => {
    res.clearCookie("jwt", { path: "/" });
    return res.send({ status: "ok", message: "Sesión cerrada" });
});
// ... (resto de las importaciones y configuraciones)

//Rutas de google authentication
// Habilitar Google Authenticator (solo admins ya logueados)
app.post("/2fa/generate", authorization.soloAdmin, twofa.generate2FA);
app.post("/2fa/verify", authorization.soloAdmin, twofa.verify2FA);
app.post("/2fa/verify-login", twofa.verifyLogin);
app.get("/2fa", (req, res) => {
    if (!req.session.pending2FA) {
        return res.redirect("/"); // o mostrar error
    }
    res.sendFile(__dirname + "/pages/2fa.html");
});



//Rutas de proyectos y tareas

app.get("/project",authorization.soloAdmin,(req,res)=> res.sendFile(__dirname + "/pages/project.html"));
app.post("/api/projects",project.createProject);
app.get("/api/projects", project.getProjects);

app.get("/task",authorization.soloAdmin,(req,res)=> res.sendFile(__dirname + "/pages/task.html"));
app.get("/api/tasks/:projectId", (req, res) => {
    console.log("projectId recibido en backend:", req.params.projectId);
});
// Obtener tareas de un proyecto usando params
app.get("/api/tasks/", task.getTask);
app.post("/api/tasks", task.createTask);
app.post("/api/tasks/:projectId",task.createTask);
app.put("/api/tasks/:id", task.updateTask); 


app.get("/access-project", authorization.soloAdmin, (req, res) => {
    res.sendFile(__dirname + "/pages/access-project.html");
});

app.post("/api/access-with-usb", project.accessWithUsb);

app.post("/api/access-with-usb", project.accessWithUsb);
// Ruta de verificación por voz
app.post('/api/projects/:id/voice-verification', project.voiceVerification);


app.get("/task",authorization.soloAdmin,(req,res)=> res.sendFile(__dirname + "/pages/task.html"));
// Obtener tareas de un proyecto por ID
app.get("/api/tasks/:projectId", task.getTasksByProject);



app.post("/api/projects/access", project.accessProject);


app.get("/api/users", authorization.soloAdmin, async (req, res) => {
    try {
        const users = await User.find(); // trae todos los usuarios de la base de datos
        res.json(users); // devuelve JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener los usuarios" });
    }
});

// Esta es la ruta para el archivo profile.html estático
app.get("/profile", authorization.soloAdmin, (req, res) => res.sendFile(__dirname + "/pages/admin/profile.html"));
app.post("/save-recovery-email", authorization.soloAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Correo inválido" });
    }

    // Obtener usuario desde el token
    const token = req.cookies.jwt;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }

    // Evitar que el correo de recuperación sea el mismo que el de login
    if (user.email === email) {
      return res.status(400).json({ success: false, error: "El correo de recuperación no puede ser igual al correo de inicio de sesión" });
    }

    user.emailRecuperacion = email;
    await user.save();

    res.json({ success: true, message: "Correo de recuperación guardado", emailRecuperacion: user.emailRecuperacion });
  } catch (err) {
    console.error("Error en save-recovery-email:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// GET: Obtener correo de recuperación
app.get("/api/recovery-email", authorization.soloAdmin, async (req, res) => {
  try {
    const token = req.cookies.jwt;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email: decoded.email }).select("emailRecuperacion");
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }

    res.json({
      success: true,
      emailRecuperacion: user.emailRecuperacion || null
    });
  } catch (err) {
    console.error("Error en GET /api/recovery-email:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

//Envio de codigos de acceso 
function generarCodigo6() {
  // 6 dígitos, con ceros a la izquierda
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function hashSHA256(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex");
}
// POST /api/recovery/send-code
app.post("/api/recovery/send-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Falta el email" });

    const user = await User.findOne({ email });
    if (!user) {
      // Evitar enumeración: respondemos genérico
      return res.json({ success: true, sent: false, reason: "Si existe y tiene correo de recuperación, se enviará" });
    }

    // Debe existir y ser distinto al principal
    if (!user.emailRecuperacion || user.emailRecuperacion === user.email) {
      return res.json({ success: true, sent: false, reason: "No tiene correo de recuperación" });
    }

    // Cooldown de 60s usando ultimoTokenEnviado (puedes crear un campo propio si prefieres)
    const ahora = new Date();
    const cooldownMs = 60 * 1000;
    if (user.ultimoTokenEnviado && (ahora - user.ultimoTokenEnviado) < cooldownMs) {
      const seg = Math.ceil((cooldownMs - (ahora - user.ultimoTokenEnviado)) / 1000);
      return res.status(429).json({ success: false, message: `Espera ${seg}s para reenviar otro código` });
    }

    // Limpieza de códigos expirados
    user.recoveryCodes = (user.recoveryCodes || []).filter(rc => !rc.expiresAt || rc.expiresAt > new Date());

    const code = generarCodigo6();
    const codeHash = hashSHA256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Opcional: limitar a 3 códigos activos
    if (user.recoveryCodes.length >= 3) {
      user.recoveryCodes.shift(); // elimina el más viejo
    }

    user.recoveryCodes.push({ code: codeHash, expiresAt, used: false });
    user.ultimoTokenEnviado = ahora;

    await user.save();

    // Enviar email al correo de recuperación
    await enviarCodigoRecuperacion(user.emailRecuperacion, code);

    return res.json({ success: true, sent: true, message: "Código enviado si el correo existe y tiene recuperación" });
  } catch (err) {
    console.error("Error /api/recovery/send-code:", err);
    return res.status(500).json({ success: false, message: "Error enviando código" });
  }
});
// POST /api/recovery/verify-code
app.post("/api/recovery/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, message: "Faltan datos" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Código inválido" });

    const codeHash = hashSHA256(code);

    // Buscar un código válido
    const idx = (user.recoveryCodes || []).findIndex(rc =>
      rc.code === codeHash && !rc.used && rc.expiresAt && rc.expiresAt > new Date()
    );

    if (idx === -1) {
      return res.status(401).json({ success: false, message: "Código inválido o expirado" });
    }

    // Marcar como usado
    user.recoveryCodes[idx].used = true;
    await user.save();

    // Iniciar sesión: mismo formato de JWT que ya usas
    const token = jwt.sign(
      { user: user.user, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.cookie("jwt", token, { httpOnly: true, path: "/" });
    return res.json({ success: true, redirect: "/mensajeRe" });
  } catch (err) {
    console.error("Error /api/recovery/verify-code:", err);
    return res.status(500).json({ success: false, message: "Error verificando código" });
  }
});
app.get("/forgot", (req, res) => res.sendFile(__dirname + "/pages/forgot.html"));
app.get("/mensajeRe", (req, res) => res.sendFile(__dirname + "/pages/mensajeRe.html"));
app.get("/cambiarpass", (req, res) => res.sendFile(__dirname + "/pages/cambiarPass.html"));
app.post("/api/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: "Falta la nueva contraseña" });
    }

    // Obtener usuario autenticado desde JWT
    const token = req.cookies.jwt;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    // 🔹 Revisar si tiene un código de recuperación válido (10 min, no usado)
    const recoveryValid = (user.recoveryCodes || []).some(rc =>
      !rc.used && rc.expiresAt && rc.expiresAt > new Date()
    );

    if (!recoveryValid) {
      // 🔹 Si NO tiene código válido, debe ingresar contraseña actual
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Debes ingresar tu contraseña actual" });
      }

      const bcrypt = await import("bcrypt");
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(401).json({ success: false, message: "La contraseña actual no es correcta" });
      }
    }

    // 🔹 Guardar la nueva contraseña
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // 🔹 Si se usó en modo recuperación, invalidar los códigos activos
    if (recoveryValid) {
      user.recoveryCodes = [];
    }

    await user.save();

    return res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error en /api/change-password:", err);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});
app.get("/api/recovery/verify-active", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json({ active: false });

    const user = await User.findOne({ email });
    if (!user) return res.json({ active: false });

    const active = (user.recoveryCodes || []).some(rc =>
      !rc.used && rc.expiresAt && rc.expiresAt > new Date()
    );

    return res.json({ active });
  } catch (err) {
    console.error("Error en /api/recovery/verify-active:", err);
    res.json({ active: false });
  }
});
// POST: Cambiar contraseña en recuperación
app.post("/api/change-password-recovery", async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, message: "Falta la nueva contraseña" });

    // Obtenemos usuario autenticado desde JWT (ya creado tras verificar código)
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ success: false, message: "No autorizado" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    // Guardamos nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Invalidamos códigos de recuperación
    user.recoveryCodes = [];
    await user.save();

    return res.json({ success: true, message: "Contraseña actualizada correctamente. Puedes iniciar sesión ahora." });
  } catch (err) {
    console.error("Error en /api/change-password-recovery:", err);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});





// Nueva ruta para obtener la información del usuario
app.get('/api/user-info', authorization.soloAdmin, async (req, res) => {
    try {
        const token = req.cookies.jwt;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Envía el nombre de usuario y el email al frontend
        res.json({ user: user.user, email: user.email });
    } catch (err) {
        console.error("Error en /api/user-info:", err);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
});
app.get('/api/enable2fa', authorization.soloAdmin, async (req, res) => {
  try {
    const token = req.cookies.jwt;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Envía si tiene 2FA activado
    res.json({ twoFAEnabled: user.twoFactorEnabled });
  } catch (err) {
    console.error("Error en /api/enable2fa:", err);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

app.post('/webauthn/register-challenge', authorization.soloAdmin, webauthn.registerChallenge);
app.post('/webauthn/register-verify', authorization.soloAdmin, webauthn.registerVerify);

// Rutas de la API de WebAuthn NO protegidas (para iniciar sesión)
app.post('/webauthn/login-challenge', webauthn.loginChallenge);
app.post('/webauthn/login-verify', webauthn.loginVerify);



app.get("/verificar/:token", async (req, res) => {
    try {
        const token = decodeURIComponent(req.params.token);
        const { email } = jwt.verify(token, process.env.JWT_SECRET);

        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(400).send(renderMessage({
                title: "Usuario no encontrado",
                message: "El enlace no es válido o el usuario no existe.",
                color: "error",
                link: "/register",
                linkText: "Volver al inicio"
            }));
        }

        // Caso: ya estaba verificado
        if (usuario.emailVerificado) {
            return res.send(renderMessage({
                title: "Correo ya verificado",
                message: "Tu cuenta ya estaba verificada. Inicia sesión para continuar.",
                color: "success",
                link: "/",
                linkText: "Iniciar sesión"
            }));
        }

        // Marcar como verificado
        usuario.emailVerificado = true;
        await usuario.save();

        res.send(renderMessage({
            title: "Correo verificado",
            message: "✅ Tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión.",
            color: "success",
            link: "/",
            linkText: "Iniciar sesión"
        }));

    } catch (err) {
        // Caso: token expirado
        if (err.name === "TokenExpiredError") {
            return res.status(400).send(renderMessage({
                title: "Enlace expirado",
                message: "Tu enlace de verificación ha caducado. Solicita uno nuevo.",
                color: "error",
                link: "/verifica-email", //  Aquí lo mandamos a tu página de reenvío
                linkText: "Generar nuevo enlace"
            }));
        }

        // Caso: token inválido
        res.status(400).send(renderMessage({
            title: "Enlace inválido",
            message: "El enlace de verificación no es válido.",
            color: "error",
            link: "/register",
            linkText: "Volver al inicio"
        }));
    }
});


import { enviarCorreoVerificacion } from "./services/emailService.js";

app.get("/reenviar-verificacion", (req, res) => {
    // Formulario simple para introducir el email
    res.send(`
        <form action="/reenviar-verificacion" method="POST" style="max-width: 400px; margin: auto; text-align: center;">
            <h2>Reenviar enlace de verificación</h2>
            <input type="email" name="email" placeholder="Tu correo" required style="padding: 10px; width: 100%; margin: 10px 0;">
            <button type="submit" style="padding: 10px 20px; background: #0d6efd; color: white; border: none; cursor: pointer;">Enviar</button>
        </form>
    `);
});

app.post("/reenviar-verificacion", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send(renderMessage({
            title: "Correo requerido",
            message: "Debes ingresar un correo electrónico.",
            color: "error",
            link: "/reenviar-verificacion",
            linkText: "Intentar de nuevo"
        }));
    }

    const usuario = await User.findOne({ email });
    if (!usuario) {
        return res.status(404).send(renderMessage({
            title: "Usuario no encontrado",
            message: "No existe ninguna cuenta con ese correo.",
            color: "error",
            link: "/reenviar-verificacion",
            linkText: "Intentar de nuevo"
        }));
    }

    if (usuario.emailVerificado) {
        return res.status(400).send(renderMessage({
            title: "Correo ya verificado",
            message: "Tu cuenta ya está verificada. Puedes iniciar sesión.",
            color: "success",
            link: "/",
            linkText: "Iniciar sesión"
        }));
    }

    try {
        await enviarCorreoVerificacion(email);
        res.send(renderMessage({
            title: "Correo reenviado",
            message: "Te hemos enviado un nuevo enlace de verificación.",
            color: "success",
            link: "/",
            linkText: "Volver al inicio"
        }));
    } catch (err) {
        console.error(err);
        res.status(500).send(renderMessage({
            title: "Error",
            message: "Hubo un problema enviando el correo. Intenta de nuevo más tarde.",
            color: "error",
            link: "/reenviar-verificacion",
            linkText: "Intentar de nuevo"
        }));
    }
});

app.get("/verifica-email", (req, res) => {
    res.sendFile(__dirname + "/pages/verifica-email.html");
});

app.post("/api/reenviar-verificacion", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) 
            return res.status(400).json({ status: "error", message: "Falta el email" });

        // Buscar usuario en la base de datos
        const usuario = await User.findOne({ email });
        if (!usuario) 
            return res.status(404).json({ status: "error", message: "Usuario no registrado" });

        if (usuario.emailVerificado) 
            return res.status(400).json({ status: "error", message: "Correo ya verificado, cierra esta pestaña" });

        // Comprobar cooldown: 5 minutos = 5*60*1000 ms
        const ahora = new Date();
        const cooldown = 5 * 60 * 1000;

        if (usuario.ultimoTokenEnviado && ahora - usuario.ultimoTokenEnviado < cooldown) {
            const minutosRestantes = Math.ceil((cooldown - (ahora - usuario.ultimoTokenEnviado)) / 60000);
            return res.status(429).json({
                status: "error",
                message: `Espera ${minutosRestantes} minuto(s) antes de solicitar un nuevo enlace`
            });
        }

        // Actualizar fecha del último token enviado
        usuario.ultimoTokenEnviado = ahora;
        await usuario.save();

        // Enviar correo de verificación
        await enviarCorreoVerificacion(email);

        return res.json({ status: "ok", message: "Nuevo enlace enviado a tu correo" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error", message: "Error reenviando el correo" });
    }
});




// Middleware para verificar si el usuario ya verificó su correo
app.post("/api/verificar-correo", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: "error", message: "Correo faltante" });

    const usuario = await User.findOne({ email });
    if (!usuario) {
        return res.status(404).json({ status: "error", message: "Correo no registrado" });
    }

    if (usuario.emailVerificado) {
        return res.json({ status: "ok", message: "Correo ya verificado", verificado: true });
    }

    return res.json({ status: "ok", message: "Correo pendiente de verificación", verificado: false });
});

app.get("/acceso-denegado", (req, res) => {
    res.send(renderMessage({
        title: "Acceso denegado",
        message: "Necesitas registrarte antes de verificar tu correo o ya ha sido verificado.",
        color: "error",
        link: "/register",
        linkText: "Ir al registro"
    }));
});