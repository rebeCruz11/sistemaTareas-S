import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

export async function enviarCorreoVerificacion(email) {
    //Crear token de verificación (expira en 1 hora)
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    //Configuración del transportador de correo
    const transporter = nodemailer.createTransport({
        service: "gmail", // Puedes ser Outlook, Yahoo y otros
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    // le puse taches a la empresa JAJA pero no se si cambiarlo
    const mailOptions = {
    from: `"tâches" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verifica tu correo electrónico",
    html: `
        <div style="font-family: Arial, sans-serif; display: flex; justify-content: center; padding: 20px;">
            <div style="max-width: 500px; width: 100%; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 20px; background-color: #fff;">
                <h2 style="text-align: center; color: #333;">¡Bienvenido a tâches, gestiona tus proyectos!</h2>
                <p style="color: #555; font-size: 16px; text-align: center;">
                    Para completar tu registro, verifica tu correo electrónico haciendo clic en el botón de abajo.
                </p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="http://localhost:4000/verificar/${token}" 
                       style="display: inline-block; padding: 12px 25px; background-color: #0d6efd; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Verificar Correo
                    </a>
                </div>
                    <p style="color: #999; font-size: 14px; text-align: center;">
                        Este enlace expirará en 1 hora. Si no creaste una cuenta, puedes ignorar este correo.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #aaa; font-size: 12px; text-align: center;">
                        tâches &copy; 2025. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        `
    };


    //Enviar correo
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Correo de verificación enviado a ${email}`);
    } catch (err) {
        console.error("Error enviando correo:", err.message);
    }
}
