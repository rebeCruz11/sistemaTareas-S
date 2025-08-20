// models/Task.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 500
  },
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"  // A quién está asignada la tarea
  },
  fechaLimite:{
    type: Date,
    required: true
  },
  proyecto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project", // Relación con el proyecto
    required: true
  },
  estado: {
    type: String,
    enum: ["Pendiente", "En Progreso", "Completada"],
    default: "Pendiente"
  },
  prioridad: {
    type: String,
    enum: ["Baja", "Media", "Alta", "Crítica"]
  }
});

export default mongoose.model("Task", taskSchema);
