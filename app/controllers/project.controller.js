import Project from "../models/Project.js";
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { encrypt, decrypt } from '../config/encryption.js';

// Función auxiliar: decodificar JWT y obtener usuario
async function getUserFromToken(req) {
    const token = req.cookies.jwt;
    if (!token) throw new Error("No autorizado");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) throw new Error("Usuario no encontrado");
    return user;
}

export const methods = {    
    async createProject(req, res) {
        try {
            const user = await getUserFromToken(req);
            const { nombre, descripcion, prioridad,fechaInicio, fechaFin, voiceTranscription } = req.body;

            // Encriptar la transcripción antes de guardar
            const encryptedTranscription = voiceTranscription 
                ? encrypt(voiceTranscription) 
                : null;

            const newProject = new Project({
                nombre,
                descripcion,
                fechaInicio,
                fechaFin,
                prioridad,
                voiceTranscription: encryptedTranscription, 
                creadoPor: user._id
            });

            await newProject.save();

            res.status(201).json({ 
                status: "ok", 
                message: "Proyecto creado con éxito", 
                project: newProject 
            });

        } catch (err) {
            console.error("Error creando proyecto:", err);
            res.status(500).json({ 
                status: "error", 
                message: err.message 
            });
        }
    },
    
    async getProjects(req, res) {
        try {
            const token = req.cookies.jwt;
            if (!token) {
                return res.status(401).json({ status: "error", message: "No autorizado" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ email: decoded.email });
            if (!user) {
                return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
            }

            const projects = await Project.find({ creadoPor: user._id }).populate("creadoPor", "email");
            
            // Desencriptar las transcripciones antes de enviar
            const decryptedProjects = projects.map(project => ({
                ...project.toObject(),
                voiceTranscription: project.voiceTranscription ? decrypt(project.voiceTranscription) : null
            }));

            res.status(200).json(decryptedProjects);
        } catch (error) {
            console.error("Error obteniendo proyectos:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo los proyectos" });
        }   
    },
    
    async getProjectById(req, res) {
        try {
            const project = await Project.findById(req.params.id).populate("creadoPor", "user email");
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }
            
            // Desencriptar transcripción
            const decryptedProject = {
                ...project.toObject(),
                voiceTranscription: project.voiceTranscription ? decrypt(project.voiceTranscription) : null
            };
            
            res.status(200).json(decryptedProject);
        } catch (error) {
            console.error("Error obteniendo proyecto por ID:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo el proyecto" });
        }
    },
    
    async updateProject(req, res) {
        try {
            let updateData = { ...req.body };
            
            // Si se actualiza la transcripción, encriptarla
            if (updateData.voiceTranscription) {
                updateData.voiceTranscription = encrypt(updateData.voiceTranscription);
            }

            const project = await Project.findByIdAndUpdate(req.params.id, updateData, { new: true });
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }
            
            // Desencriptar para la respuesta
            const decryptedProject = {
                ...project.toObject(),
                voiceTranscription: project.voiceTranscription ? decrypt(project.voiceTranscription) : null
            };
            
            res.status(200).json(decryptedProject);
        } catch (error) {
            console.error("Error actualizando proyecto:", error);
            res.status(500).json({ status: "error", message: "Error actualizando el proyecto" });
        }
    },
    
    async deleteProject(req, res) {
        try {
            const project = await Project.findByIdAndDelete(req.params.id);
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }
            res.status(200).json({ status: "ok", message: "Proyecto eliminado" });
        } catch (error) {
            console.error("Error eliminando proyecto:", error);
            res.status(500).json({ status: "error", message: "Error eliminando el proyecto" });
        }
    },

    // Verificación por voz
    async voiceVerification(req, res) {
        try {
            const { transcriptionAttempt } = req.body;
            const project = await Project.findById(req.params.id);

            if (!project || !project.voiceTranscription) {
                return res.status(404).json({ status: "error", message: "Proyecto o transcripción no encontrados" });
            }

            // Desencriptar la transcripción guardada
            const storedTranscription = decrypt(project.voiceTranscription);

            // Comparar (puedes usar lowercase/trim para mayor tolerancia)
            if (storedTranscription.trim().toLowerCase() === transcriptionAttempt.trim().toLowerCase()) {
                return res.status(200).json({ status: "ok", message: "Verificación exitosa" });
            } else {
                return res.status(401).json({ status: "error", message: "La frase no coincide" });
            }

        } catch (error) {
            console.error("Error en verificación de voz:", error);
            res.status(500).json({ status: "error", message: "Error en verificación de voz" });
        }
    }

}



export default { methods };
