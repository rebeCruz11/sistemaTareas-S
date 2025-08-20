import Project from "../models/Project.js";
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const methods = {    
    async createProject(req, res) {
        try {

            const { nombre, descripcion, fechaInicio ,fechaFin, estado, prioridad } = req.body;

            if (!nombre || !descripcion || !fechaInicio || !fechaFin || !estado || !prioridad) {
                return res.status(400).json({ status: "error", message: "Los campos estan incompletos" });
            }

            // Obtener el usuario actual desde el token
            const token = req.cookies.jwt;
            console.log("Token recibido:", token);

            if (!token) {
                return res.status(401).json({ status: "error", message: "No autorizado" });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ email: decoded.email });
            console.log("Usuario decodificado:", decoded);
            console.log("Usuario encontrado:", user);

            if (!user) {
                return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
            }

            // Crear el proyecto
            const newProject = new Project({
                nombre,
                descripcion,
                creadoPor: user,
                fechaInicio: new Date(fechaInicio),
                fechaFin: new Date(fechaFin),
                estado,
                prioridad
            });
            await newProject.save();
            res.status(201).json({ status: "ok", message: "Proyecto creado exitosamente", project: newProject });


        } catch (error) {
            console.error("Error creando proyecto:", error);
            res.status(500).json({ status: "error", message: "Error creando el proyecto" });
        }   
    }
    ,
    async getProjects(req, res) {
        try {
            const projects = await Project.find().populate("creadoPor", "user email");
            res.status(200).json(projects);
        } catch (error) {
            console.error("Error obteniendo proyectos:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo los proyectos" });
        }   
    }
    ,
    async getProjectById(req, res) {
        try {
            const project = await Project.findById(req.params.id).populate("creadoPor", "user email");
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }
            res.status(200).json(project);
        } catch (error) {
            console.error("Error obteniendo proyecto por ID:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo el proyecto" });
        }
    }   
    ,
    async updateProject(req, res) {
        try {
            const project = await Project.findByIdAndUpdate(req.params
            .id, req.body, { new: true });
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }
            res.status(200).json(project);
        } catch (error) {
            console.error("Error actualizando proyecto:", error);
            res.status(500).json({ status: "error", message: "Error actualizando el proyecto" });
        }
    }
    ,
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
    }   
}

export default { methods };