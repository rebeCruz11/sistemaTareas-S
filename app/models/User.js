import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    user: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null},
    googleId: { 
        type: String, 
        default: null // se guarda el ID de Google si aplica
    },
    emailVerificado: { type: Boolean, default: false },
    ultimoTokenEnviado: { type: Date },
    passkeys: { type: Array, default: [] },
    webauthnChallenge: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null }
    
});

export default mongoose.model("User", userSchema);
