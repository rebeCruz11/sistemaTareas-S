// services/recoveryEmailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export async function enviarCodigoRecuperacion(destinatario, code) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const mailOptions = {
    from: `"tâches" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: "Tu código de acceso de recuperación",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h2 style="margin:0 0 8px;color:#111">Código de acceso</h2>
        <p style="color:#444;margin:0 0 16px">
          Usa este código para continuar con tu inicio de sesión:
        </p>
        <div style="font-size:32px;letter-spacing:6px;text-align:center;margin:16px 0;font-weight:700">
          ${code}
        </div>
        <p style="color:#666;margin:0 0 8px">El código expira en 10 minutos.</p>
        <p style="color:#aaa;font-size:12px;margin:16px 0 0">tâches © 2025</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}
