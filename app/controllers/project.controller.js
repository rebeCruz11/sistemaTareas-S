import Project from "../models/Project.js";
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { encrypt, decrypt } from '../config/encryption.js';
import * as usbKeyService from '../services/usbKey.service.js'

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
            const { nombre, descripcion, prioridad,fechaInicio, fechaFin, voiceTranscription, claveAcceso, generarLlaveUSB, usbPath } = req.body;

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
                creadoPor: user._id,
                claveAcceso,
                generarLlaveUSB,
                usbPath
            });
            // Si se solicita generar llave USB
            if (generarLlaveUSB && usbPath) {
                const { keyId, keyHash, fileName, fileContent } = usbKeyService.generateUsbKey(newProject._id);

                // Guardar el hash y el ID de la llave en el proyecto
                newProject.usbKey = {
                    keyId,
                    keyHash
                };

                // Escribir el archivo en la USB
                await usbKeyService.writeKeyToUsb(usbPath, fileName, fileContent);
            }

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

    // controllers/projectController.js
  
    
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

     // ✅ Verificación por voz
    async  voiceVerification(req, res) {
        try {
            const projectId = req.params.id;
            const { transcriptionAttempt } = req.body;

            // Buscar proyecto solo por ID
            const project = await Project.findById(projectId);
            if (!project) return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });

            console.log(project.voiceTranscription);

            // Desencriptar y comparar
            const decryptedVoice = decrypt(project.voiceTranscription);
            
            if (decryptedVoice.trim().toLowerCase() === transcriptionAttempt.trim().toLowerCase()) {
                return res.json({ status: "ok", message: "Verificación exitosa" });
            } else {
                return res.json({ status: "fail", message: "La clave es incorrecta" });
            }

        } catch (error) {
            console.error("Error en voice-verification:", error);
            res.status(500).json({ status: "error", message: "Error en el servidor" });
        }
    },
       // accessProject corregido al estilo voiceVerification
async accessProject(req, res) {
    try {
        const { clave } = req.body;
        console.log("Clave recibida:", clave); 

        const project = await Project.findOne({ claveAcceso: clave.trim() });
        console.log(project);

        if (!project) {
            console.log("No se encontró el proyecto"); 
            return res.status(404).json({ 
                status: "fail", 
                message: "Clave de acceso inválida" 
            });
        }

        res.json({
            status: "ok",
            message: "Acceso concedido",
            projectId: project._id,  // en Mongoose se usa _id
            nombre: project.nombre,
            descripcion: project.descripcion
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            status: "error", 
            message: "Error en el servidor" 
        });
    }
},

// este es parte para generar la llave usb
    async accessWithUsb(req, res) {
    try {
        const { keyData, projectId, usbPath, fileName } = req.body;

        // Validación directa desde keyData (enviado por frontend)
        if (keyData) {
            if (!keyData.projectId || !keyData.key) {
                return res.status(400).json({ status: "error", message: "Faltan datos en keyData" });
            }

            const project = await Project.findById(keyData.projectId);
            if (!project || !project.usbKey || !project.usbKey.keyHash) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado o sin llave USB registrada" });
            }

            const isValid = usbKeyService.verifyKey(keyData.key, project.usbKey.keyHash);
            if (!isValid) {
                return res.status(403).json({ status: "error", message: "Llave USB inválida o no coincide" });
            }

            const decryptedProject = {
                ...project.toObject(),
                voiceTranscription: project.voiceTranscription ? decrypt(project.voiceTranscription) : null
            };

            return res.status(200).json({ status: "ok", message: "Acceso concedido", project: decryptedProject });
        }

        // Validación tradicional desde USB física
        if (!projectId || !usbPath || !fileName) {
            return res.status(400).json({ status: "error", message: "Faltan datos para validar desde USB" });
        }

        const project = await Project.findById(projectId);
        if (!project || !project.usbKey || !project.usbKey.keyHash) {
            return res.status(404).json({ status: "error", message: "Proyecto no encontrado o sin llave USB registrada" });
        }

        const keyDataFromUsb = await usbKeyService.readKeyFromUsb(usbPath, fileName);
        const isValid = usbKeyService.verifyKey(keyDataFromUsb.key, project.usbKey.keyHash);

        if (!isValid) {
            return res.status(403).json({ status: "error", message: "Llave USB inválida o no coincide" });
        }

        const decryptedProject = {
            ...project.toObject(),
            voiceTranscription: project.voiceTranscription ? decrypt(project.voiceTranscription) : null
        };

        return res.status(200).json({ status: "ok", message: "Acceso concedido", project: decryptedProject });

    } catch (error) {
        console.error("Error en acceso con USB:", error);
        res.status(500).json({ status: "error", message: "Error validando la llave USB" });
    }
}



}



export default { methods };
