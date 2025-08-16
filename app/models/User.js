import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    user: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    emailVerificado: { type: Boolean, default: false },
    ultimoTokenEnviado: { type: Date } 
});

export default mongoose.model("User", userSchema);
