// webauthn.controller.js
import crypto from 'node:crypto';
import User from '../models/User.js';
import jwt from "jsonwebtoken";
// webauthn.controller.js
import base64url from "base64url";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} from '@simplewebauthn/server';

if (!globalThis.crypto) globalThis.crypto = crypto;

const challengeStore = {};
// Guardamos los challenges temporalmente en memoria
// (en producción deberías usar tu BD o sesión)
const challenges = new Map();

export async function registerChallenge(req, res) {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // El ID de usuario para WebAuthn se genera a partir del email
    const userIdBuffer = Buffer.from(user.email, 'utf-8');

    const options = await generateRegistrationOptions({
        rpName: 'Mi Sistema',
        rpID: 'localhost',
        userID: Buffer.from(userIdBuffer),
        userName: user.user,
        timeout: 180000,

        attestationType: 'none',
        authenticatorSelection: {
            authenticatorAttachment: 'platform', // clave local (huella / PIN)
            userVerification: 'required'
        }
    });

    // Guardamos el desafío usando el email como clave
    challengeStore[email] = options.challenge;
    return res.json({ options });
}


export async function registerVerify(req, res) {
    const { email, cred } = req.body;

    if (!email || !cred) {
        return res.json({ verified: false, error: "Faltan datos de email o credencial." });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.json({ verified: false, error: "Usuario no encontrado." });
    }

    const expectedChallenge = challengeStore[email];
    if (!expectedChallenge) {
        return res.json({ verified: false, error: "Desafío no válido o expirado." });
    }

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: cred,
            expectedChallenge,
            expectedOrigin: "http://localhost:4000",
            expectedRPID: "localhost",
        });

        console.log("verification:", verification);

        if (verification.verified) 
        {

            const { registrationInfo } = verification;
            if (
                !registrationInfo ||
                !registrationInfo.credential ||
                !registrationInfo.credential.id ||
                !registrationInfo.credential.publicKey
            ) {
                return res.status(500).json({ error: "Información de registro incompleta." });
            }
            
            const credentialID = registrationInfo.credential.id;
            const credentialPublicKey = registrationInfo.credential.publicKey;
            const counter  = registrationInfo.credential.counter;

            const pubKeyBase64 = base64url.encode(Buffer.from(credentialPublicKey));

            user.passkeys.push({
                credentialID: credentialID,
                credentialPublicKey: pubKeyBase64,
                counter,
                transports: registrationInfo.transports || ["internal"],
            });

            await user.save();
            delete challengeStore[email]; // Limpiar desafío

            return res.json({ verified: true });
        }
    } catch (error) {
        console.error("Error durante la verificación de registro:", error);
        return res.json({ verified: false, error: "La verificación de la passkey falló." });
    }
}


/**
 * LOGIN CHALLENGE
 * Envía el challenge al frontend
 */
export async function loginChallenge(req, res) {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ message: "Email requerido" });

        const user = await User.findOne({ email });
        if (!user || !user.passkeys || user.passkeys.length === 0) {
            return res.status(404).json({ message: "Usuario o passkeys no encontrados" });
        }

        const challenge = crypto.randomBytes(32).toString("base64url");

        // Guardar el challenge temporalmente
        challenges.set(email, challenge);

       const allowCredentials = user.passkeys.map(pk => ({
            id: pk.credentialID, 
            //id: base64url.toBuffer(pk.credentialID), 
            type: "public-key",
            transports: ["internal"],
        }));
        

        return res.json({
            options: {
                challenge,
                rpId: "localhost",
                //userVerification: "preferred",
                userVerification:"required",
                allowCredentials,
                /*authenticatorSelection: {
                    authenticatorAttachment: 'platform', // clave local (huella / PIN)
                    userVerification: 'required'
                }*/
            }
        });


    } catch (error) {
        console.error("Error en loginChallenge:", error);
        res.status(500).json({ message: "Error generando challenge" });
    }
}

/**
 * LOGIN VERIFY
 * Verifica la respuesta del cliente contra el challenge
 */
export async function loginVerify(req, res) {
    try {
        const { email, cred } = req.body;
        if (!email || !cred) 
            return res.status(400).json({ message: "Datos incompletos" });

        const expectedChallenge = challenges.get(email);
        if (!expectedChallenge) 
            return res.status(400).json({ message: "Challenge no encontrado o expirado" });

        const user = await User.findOne({ email });
        if (!user) 
            return res.status(404).json({ message: "Usuario no encontrado" });

        // Convertir cred.id (ArrayBuffer) a Base64URL para buscar en la DB
        const receivedID = cred.id; // usar directamente
        const authenticator = user.passkeys.find(pk => pk.credentialID === cred.id);

        if (!authenticator) 
            return res.status(400).json({ message: "No se encontró la passkey" });

        let pubkeyBuff = Buffer.from(authenticator.credentialPublicKey, "base64");
        let counterToSend = authenticator.counter;
        if (typeof counterToSend === "string") {
            counterToSend = parseInt(counterToSend, 10);
        }else if (typeof counterToSend === "bigint") {
            counterToSend = Number(counterToSend);
        }

        // Verificar la respuesta de autenticación
        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: cred,
                expectedChallenge,
                expectedOrigin: "http://localhost:4000",
                expectedRPID: "localhost",
                credential: {
                    id: authenticator.credentialID,
                    publicKey: pubkeyBuff,
                    counter:Number(counterToSend),
                    transports: authenticator.transports,
                },
            });
        } catch (err) {
            console.error("Error verificando autenticación:", err);
            return res.status(400).json({ message: "Autenticación fallida" });
        }

        if (!verification.verified) {
            return res.status(400).json({ message: "Firma inválida" });
        }

        // Actualizar counter
        authenticator.counter = verification.authenticationInfo.newCounter;
        await user.save();

        // Limpiar challenge
        challenges.delete(email);

        return res.json({ success: true, message: "Login verificado correctamente" });

    } catch (error) {
        console.error("Error en loginVerify:", error);
        res.status(500).json({ message: "Error verificando login" });
    }
}