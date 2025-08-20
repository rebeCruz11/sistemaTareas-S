import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

import dotenv from "dotenv";
dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Buscar si el usuario ya existe en DB
        let usuario = await User.findOne({ email: profile.emails[0].value });

        if (!usuario) {
            // Crear nuevo usuario con datos de Google
            usuario = new User({
                user: profile.displayName,
                email: profile.emails[0].value,
                password: null, 
                emailVerificado: true, 
                googleId: profile.id
            });
            await usuario.save();
        }

        return done(null, usuario);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});
