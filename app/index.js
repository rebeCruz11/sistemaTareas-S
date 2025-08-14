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



/* Ruta para verificar correo
app.get("/verificar/:token", async (req, res) => {
    try {
        const { email } = jwt.verify(req.params.token, process.env.JWT_SECRET);

        // Buscar usuario y marcarlo como verificado
        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(400).send("Usuario no encontrado");
        }

        usuario.emailVerificado = true;
        await usuario.save();

        res.send("✅ Correo verificado con éxito. Ya puedes iniciar sesión.");
    } catch (err) {
        res.status(400).send("Enlace inválido o expirado");
    }
});
*/
app.get("/verificar/:token", async (req, res) => {
    try {
        const { email } = jwt.verify(req.params.token, process.env.JWT_SECRET);

        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(400).send(renderMessage({
                title: "Usuario no encontrado",
                message: "El enlace que has usado no es válido o el usuario no existe.",
                color: "error",
                link: "/register",
                linkText: "Volver al inicio"
            }));
        }

        usuario.emailVerificado = true;
        await usuario.save();

        res.send(renderMessage({
            title: "Correo verificado",
            message: "Tu cuenta ya está lista. Puedes iniciar sesión ahora mismo.",
            color: "success",
            link: "/",
            linkText: "Iniciar sesión"
        }));

    } catch (err) {
        res.status(400).send(renderMessage({
            title: "Enlace inválido o expirado",
            message: "Solicita un nuevo enlace para verificar tu correo.",
            color: "error",
            link: "/register",
            linkText: "Volver al inicio"
        }));
    }
});

