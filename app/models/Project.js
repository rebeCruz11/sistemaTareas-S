// models/Project.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true, maxlength: 500 },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fechaInicio: { type: Date, default: Date.now },
  fechaFin: { type: Date },
  estado: { 
    type: String, 
    enum: ["Activo", "En Pausa", "Completado", "Cancelado"], 
    default: "Activo" 
  },
  prioridad: { 
    type: String, 
    enum: ["Baja", "Media", "Alta", "Crítica"], 
    default: "Media" 
  },

});

export default mongoose.model("Project", projectSchema);
