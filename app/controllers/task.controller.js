import Project from "../models/Project.js";
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Task from '../models/Task.js';


export const methods = {
    async  getTasksByProject(req, res) {
    try {
        const projectId = req.query.projectId; // o req.body.proyectoId según tu preferencia

        if (!projectId) {
            return res.status(400).json({ error: "ID del proyecto es requerido" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: "Proyecto no encontrado" });
        }

        const tasks = await Task.find({ proyecto: projectId });
        res.json(tasks); // array directo
    } catch (err) {
        console.error("Error obteniendo tareas:", err);
        res.status(500).json({ error: "Error obteniendo tareas" });
    }
},




    async getProjectTasks(req, res) {
        
        try {
            const projectId = req.body.proyectoId;
            const tareas = await Task.find({ projectId }); // devuelve array de Mongo
            res.json(tareas); // devolvemos directo el array
        } catch (err) {
            console.error("Error obteniendo tareas:", err);
            res.status(500).json({ error: "Error obteniendo tareas" });
        }
    }
    ,
    async createTask(req, res) {
        try {
            // const projectId = req.params.projectId;
            const projectId = req.body.proyectoId;


            console.log(" projectId recibido:", projectId);

            if (!projectId) {
                return res.status(400).json({ status: "error", message: "ID del proyecto es requerido" });
            }
            // Verificar si el proyecto existe
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }
            const { titulo, descripcion, fechaLimite,estado, prioridad } = req.body;
            const task = new Task({
                titulo,
                descripcion,
                proyecto: projectId,
                asignadoA: null, // Se asignará más tarde
                fechaLimite,
                estado,
                prioridad
            });
            await task.save();
            res.status(201).json({ status: "ok", message: "Tarea creada exitosamente", task });
        } catch (error) {
            console.error("Error creando tarea:", error);
            res.status(500).json({ status: "error", message: "Error creando la tarea" });
        }
    }
    ,
    async updateTask(req, res) {
        try {
            const taskId = req.params.id;
            const { usuarioId } = req.body; // Solo el usuario asignado

            // Verificar si la tarea existe
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ status: "error", message: "Tarea no encontrada" });
            }

            // Actualizar únicamente el usuario asignado
            task.asignadoA = usuarioId;

            await task.save();
            res.status(200).json({ status: "ok", message: "Usuario asignado correctamente", task });
        } catch (error) {
            console.error("Error asignando usuario:", error);
            res.status(500).json({ status: "error", message: "Error asignando el usuario a la tarea" });
        }
    }

    ,
    async deleteTask(req, res) {    
        try {
            const taskId = req.params.id;

            // Verificar si la tarea existe
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ status: "error", message: "Tarea no encontrada" });
            }

            await Task.findByIdAndDelete(taskId);
            res.status(200).json({ status: "ok", message: "Tarea eliminada exitosamente" });
        } catch (error) {
            console.error("Error eliminando tarea:", error);
            res.status(500).json({ status: "error", message: "Error eliminando la tarea" });
        }
    }
    ,
    async getTask(req, res) {
        try {
            const projectId = req.query.projectId;
            
            console.log("projectId recibido en backend:", projectId);

            if (!projectId) {
                return res.status(400).json({ status: "error", message: "ID del proyecto es requerido" });
            }

            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }

            const tasks = await Task.find({ proyecto: projectId })
                .populate({
                    path: "proyecto",
                    select: "creadoPor",
                    populate: { path: "creadoPor", select: "user email" }
                });

            res.status(200).json(tasks);

        } catch (error) {
            console.error("Error obteniendo tareas:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo las tareas" });
        }   
    },
    
    // async assignTask  (req, res) {
    //     const { id } = req.params;
    //     const { asignadoA } = req.body;
    //     // Buscar la tarea y actualizar el asignado
    //     const task = await Task.findByIdAndUpdate(id, { asignadoA }, { new: true });
    //     res.json(task);
    // },
    async assignTask(req, res) {
        try {
            const taskId = req.params.id;
            const { usuarioId } = req.body;

            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ status: "error", message: "Tarea no encontrada" });

            const user = await User.findById(usuarioId);
            if (!user) return res.status(404).json({ status: "error", message: "Usuario no encontrado" });

            task.asignadoA = usuarioId;
            await task.save();

            res.status(200).json({ status: "ok", message: "Usuario asignado correctamente", task });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: "error", message: "Error asignando usuario a la tarea" });
        }
    }

    ,

    async getTaskById(req, res) {
        try {
            const taskId = req.params.id;

            // Verificar si la tarea existe
            const task = await Task.findById(taskId).populate("asignadoA", "user email");
            if (!task) {
                return res.status(404).json({ status: "error", message: "Tarea no encontrada" });
            }

            res.status(200).json({ status: "ok", task });
        } catch (error) {
            console.error("Error obteniendo tarea por ID:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo la tarea" });
        }
    }
    ,
    async getTasksByUser(req, res) {
        try {
            const userId = req.query.userId;

            if (!userId) {
                return res.status(400).json({ status: "error", message: "ID del usuario es requerido" });
            }

            // Verificar si el usuario existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
            }

            // Obtener las tareas asignadas al usuario
            const tasks = await Task.find({ asignadoA: userId }).populate("proyecto", "nombre");

            res.status(200).json({ status: "ok", tasks });
        } catch (error) {
            console.error("Error obteniendo tareas del usuario:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo las tareas del usuario" });
        }
    }   
    ,
    async getTasksByProject(req, res) {
        try {
            const projectId = req.query.projectId;

            if (!projectId) {
                return res.status(400).json({ status: "error", message: "ID del proyecto es requerido" });
            }

            // Verificar si el proyecto existe
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ status: "error", message: "Proyecto no encontrado" });
            }

            // Obtener las tareas del proyecto
            const tasks = await Task.find({ proyecto: projectId }).populate("asignadoA", "user email");

            res.status(200).json({ status: "ok", tasks });
        } catch (error) {
            console.error("Error obteniendo tareas del proyecto:", error);
            res.status(500).json({ status: "error", message: "Error obteniendo las tareas del proyecto" });
        }
    }
};

export default {methods}