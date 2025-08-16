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


//Rutas
app.get("/",authorization.soloPublico, (req,res)=> res.sendFile(__dirname + "/pages/login.html"));
app.get("/register",authorization.soloPublico,(req,res)=> res.sendFile(__dirname + "/pages/register.html"));
app.get("/admin",authorization.soloAdmin,(req,res)=> res.sendFile(__dirname + "/pages/admin/admin.html"));
app.post("/api/login",authentication.login);
app.post("/api/register",authentication.register);
app.post("/api/logout", (req, res) => {
    res.clearCookie("jwt", { path: "/" });
    return res.send({ status: "ok", message: "Sesión cerrada" });
});


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





