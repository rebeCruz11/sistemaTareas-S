import speakeasy from "speakeasy";
import QRCode from "qrcode";
import User from "../models/User.js";

// Paso 1: Generar secreto y QR
export const generate2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `MiSistema (${req.user.email})`, // aparece así en la app
      length: 20
    });

    // Guardamos el secreto en BD (todavía no activamos 2FA)
    await User.findByIdAndUpdate(req.user._id, {
      twoFactorSecret: secret.base32
    });

    // Generamos QR para mostrar en frontend
    const qr = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qr, secret: secret.base32 });
  } catch (err) {
    console.error("Error generando 2FA:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

// Paso 2: Verificar código y activar 2FA
export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body; // código de 6 dígitos
    const user = await User.findById(req.user._id);

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token
    });

    if (!verified) {
      return res.status(400).json({ error: "Código inválido" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: "✅ 2FA activado con éxito" });
  } catch (err) {
    console.error("Error verificando 2FA:", err);
    res.status(500).json({ error: "Error interno" });
  }
};
