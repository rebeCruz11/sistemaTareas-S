import bcryptjs from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import dns from "dns"; //Para validar dominio MX
import User from "../models/User.js";
import { enviarCorreoVerificacion } from "../services/emailService.js";


dotenv.config();

function verificarDominioEmail(email) {
    return new Promise((resolve) => {
        const dominio = email.split("@")[1];
        dns.resolveMx(dominio, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                return resolve(false);
            }
            resolve(true);
        });
    });
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email  || !password) {
            return res.status(400).send({ status: "Error", message: "Los campos están incompletos" });
        }

        const usuarioAResvisar = await User.findOne({ email  });
        if (!usuarioAResvisar) {
            return res.status(400).send({ status: "Error", message: "Usuario no encontrado" });
        }

        const loginCorrecto = await bcryptjs.compare(password, usuarioAResvisar.password);
        if (!loginCorrecto) {
            return res.status(400).send({ status: "Error", message: "Contraseña incorrecta" });
        }

        // Verificar si el correo ha sido confirmado
        if (!usuarioAResvisar.emailVerificado) {
            return res.status(400).send({ status: "Error", message: "Debes verificar tu correo antes de iniciar sesión" });
        }

        const token = jsonwebtoken.sign(
            {email: usuarioAResvisar.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        const cookieOption = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
            path: "/",
            httpOnly: true
        };

        res.cookie("jwt", token, cookieOption);
        res.send({ status: "ok", message: "Usuario logueado", redirect: "/project" });

    } catch (err) {
        res.status(500).send({ status: "Error", message: "Error en el servidor", error: err.message });
    }
}

async function register(req, res) {
    try {
        const { user, password, email } = req.body;

        if (!user || !password || !email) {
            return res.status(400).send({ status: "Error", message: "Los campos están incompletos" });
        }

        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) {
            return res.status(400).send({ status: "Error", message: "Formato de email inválido" });
        }

        // Validar dominio con DNS MX
        const dominioValido = await verificarDominioEmail(email);
        if (!dominioValido) {
            return res.status(400).send({ status: "Error", message: "El dominio del email no es válido" });
        }

        // Validar si ya existe en BD
        const usuarioExistente = await User.findOne({ $or: [{ user }, { email }] });
        if (usuarioExistente) {
            return res.status(400).send({ status: "Error", message: "Este usuario o email ya existe" });
        }

        // Encriptar contraseña
        const salt = await bcryptjs.genSalt(5);
        const hashPassword = await bcryptjs.hash(password, salt);

        const ahora = new Date();

        // Guardar usuario
        const nuevoUsuario = new User({
            user,
            email,
            password: hashPassword,
            emailVerificado: false,
            ultimoTokenEnviado: ahora

        });
           
        await nuevoUsuario.save();

        // Enviar correo de verificación sin bloquear el registro
        try {
            await enviarCorreoVerificacion(email);
        } catch (error) {
            console.error("Error enviando correo de verificación:", error.message);
        }

        return res.status(201).send({
            status: "ok",
            message: `Usuario ${nuevoUsuario.user} agregado`,
            redirect: "/verifica-email"
        });

    } catch (err) {
        res.status(500).send({ status: "Error", message: "Error en el servidor no se pueedo guardar", error: err.message });
    }
}


export const methods = { login, register };
