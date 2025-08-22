import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

async function soloAdmin(req, res, next) {
    const logueado = await revisarCookie(req);
    if (logueado) return next();
    return res.redirect("/");
}

async function soloPublico(req, res, next) {
    const logueado = await revisarCookie(req);
    if (!logueado) return next();
    return res.redirect("/project");
}

async function revisarCookie(req) {
    try {
        // Buscar cookie con JWT
        const cookieJWT = req.headers.cookie?.split("; ")
            .find(cookie => cookie.startsWith("jwt="))
            ?.slice(4);

        if (!cookieJWT) return false;

        // Verificar token
        const decodificada = jsonwebtoken.verify(cookieJWT, process.env.JWT_SECRET);

        // Buscar usuario en la base de datos
        const usuarioAResvisar = await User.findOne({ email: decodificada.email });
        if (!usuarioAResvisar) return false;

        return true;
    } catch {
        return false;
    }
}

export const methods = { soloAdmin, soloPublico};
