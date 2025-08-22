// Manejo del formulario de creación de proyecto
document.getElementById("projectForm").addEventListener("submit", async (e) => {
    e.preventDefault();



    const nombre = document.getElementById("nombre").value;
    const descripcion = document.getElementById("descripcion").value;
    const fechaInicio = document.getElementById("fechaInicio").value;
    const fechaFin = document.getElementById("fechaFin").value;
    const estado = document.getElementById("estado").value;
    const prioridad = document.getElementById("prioridad").value;
    const voiceTranscription = document.getElementById("voiceTranscription").value;
    const claveAcceso = document.getElementById("password").value
    const generarLlaveUSB = document.getElementById("generarLlaveUSB")?.checked || false;
    const usbPath = document.getElementById("usbPath")?.value || null;

    const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            nombre, 
            descripcion,
            fechaInicio, 
            fechaFin, 
            estado, 
            prioridad,
            voiceTranscription,
            claveAcceso,
            generarLlaveUSB,
            usbPath
         })
    });

    const data = await res.json();
    if (data.status === "ok") {
        alert("Proyecto creado exitosamente");
        if (data.generarLlaveUSB && data.usbPath) {
            alert("🔐 Llave USB generada y guardada en: " + data.usbPath);
        }

        e.target.reset();
        bootstrap.Modal.getInstance(document.getElementById("createProjectModal")).hide();
        loadProjects();

         window.location.reload();
    } else {
        alert(data.message || "Error creando el proyecto");
    }
});


document.getElementById("editProjectModal").addEventListener("input", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("editNombre").value;
    const descripcion = document.getElementById("editDescripcion").value;
    const fechaInicio = document.getElementById("editFechaInicio").value;
    const fechaFin = document.getElementById("editFechaFin").value;
    const estado = document.getElementById("editEstado").value;
    const prioridad = document.getElementById("editPrioridad").value;
    const projectId = document.getElementById("editProjectId").value;
    const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion, fechaInicio, fechaFin, estado, prioridad })
    });
    const data = await res.json();
    if (data.status === "ok") {
        alert("Proyecto actualizado exitosamente");
        window.location.reload();
    } else {
        alert(data.message || "Error actualizando el proyecto");
    }
});


async function loadTasks() {
    if (!projectId) return;

    try {
        const res = await fetch(`/api/tasks/${projectId}`);
        const data = await res.json();

        console.log("Tareas recibidas:", data);

        // Aquí puedes llamar a una función que renderice tus tareas en HTML
        renderTasks(data);
    } catch (error) {
        console.error("Error cargando tareas:", error);
    }
}





function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 porque los meses van de 0 a 11
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getStatusClass(status) {
    switch (status) {
        case 'Pendiente':
            return 'status-pending';
        case 'En Progreso':
            return 'status-in-progress';
        case 'Completado':
            return 'status-completed';
        default:
            return '';
    }
}
function getPriorityClass(priority) {
    switch (priority) {
        case 'Baja':
            return 'priority-low';
        case 'Media':
            return 'priority-medium';
        case 'Alta':
            return 'priority-high';
        case 'Crítica':
            return 'priority-critical';
        default:
            return '';
    }
}


//Renderizar card de proyectos
async function loadProjects() {
    const res = await fetch("/api/projects");
    const projects = await res.json();
    const projectsContainer = document.getElementById("projectsCardsContainer");
    projectsContainer.innerHTML = ""; // Limpiar contenedor
    projects.forEach((project) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card project-card h-100">
                    <div class="card-header-custom">
                        <h5 class="project-title">${project.nombre}</h5>
                        <p class="project-description">${truncateText(project.descripcion || "Sin descripción")}</p>
                    </div>
                    <div class="card-body-custom">
                        <div class="project-info">
                            <div class="info-item">
                                <i class="fas fa-calendar-alt"></i>
                                <strong>Inicio:</strong> ${formatDate(project.fechaInicio)}
                            </div>
                            <div class="info-item">
                                <i class="fas fa-calendar-check"></i>
                                <strong>Fin:</strong> ${formatDate(project.fechaFin)}
                            </div>
                            <div class="info-item">
                                <i class="fas fa-flag"></i>
                                <strong>Estado:</strong> 
                                <span class="status-badge ${getStatusClass(project.estado)}">${project.estado}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-exclamation-circle"></i>
                                <strong>Prioridad:</strong> 
                                <span class="priority-badge ${getPriorityClass(project.prioridad)}">${project.prioridad}</span>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="btn-action btn-edit" onclick="addTask('${project._id}')" title="Agregar Tarea">

                                <i class="fas fa-add"></i>
                            </button>
                            <button class="btn-action btn-edit" onclick="addTask('${project._id}')" title="Editar Tarea">

                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteProject(${project.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn-action btn-access" onclick="window.location.href='/access-project'" title="Acceder con USB">
                                <i class="fas fa-key"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        `;
        projectsContainer.appendChild(card);
    });
}   

// async function accessProject() {
//   const accessKey = document.getElementById("accessKeyInput").value;

//   if (!accessKey) {
//     alert("Por favor ingresa una clave");
//     return;
//   }

//   try {
//     const res = await fetch("http://localhost:4000/api/projects/access", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ clave: accessKey }) // 👈 debe coincidir con req.body.clave en el backend
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       alert(data.msg);
//       return;
//     }

//     // Guardar id y redirigir
//     localStorage.setItem("projectId", data.projectId);
//     window.location.href = `/task?projectId=${data.projectId}`;

//   } catch (error) {
//     console.error(error);
//     alert("Error al conectar con el servidor");
//   }
// }
document.getElementById("accessBtn").addEventListener("click", async () => {
    const accessKey = document.getElementById("accessKeyInput").value;

    if (!accessKey) {
        alert("Por favor ingresa una clave");
        return;
    }

    try {
        const res = await fetch("/api/projects/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clave: accessKey }) // debe coincidir con el backend
        });

        const data = await res.json();
        console.log("Respuesta del backend:", data);

        if (data.status === "ok") {
            
            localStorage.setItem("projectId", data.projectId);

            
            window.location.href = `/task?projectId=${data.projectId}`;

        } else {
            
            alert(data.message || "Clave inválida");
        }

    } catch (error) {
        console.error("Error en el acceso:", error);
        alert("Error al conectar con el servidor");
    }
});



function addTask(projectId) {
    console.log("Enviando projectId:", projectId);

    // Guardar ID actual en variable global
    window.currentProjectId = projectId;

    // Abrir modal de verificación por voz
    const voiceModal = new bootstrap.Modal(document.getElementById('voiceVerificationModal'));
    voiceModal.show();
}

// Proceder a creación de tareas
function proceedToTaskCreation(projectId) {
    window.location.href = `/task?projectId=${projectId}`;
}



// Reset del modal cada vez que se abre
document.getElementById('voiceVerificationModal').addEventListener('shown.bs.modal', () => {
    currentTranscription = '';
    document.getElementById('transcribedText').textContent = '';
    document.getElementById('transcriptionResult').style.display = 'none';
    document.getElementById('startVoiceBtn').style.display = 'block';
    document.getElementById('confirmVoiceBtn').style.display = 'none';
    document.getElementById('voiceStatus').innerHTML = '<span class="text-muted">Haz clic en el botón para comenzar</span>';
});


document.getElementById('searchProjects').addEventListener('input', searchProjects);

document.addEventListener("DOMContentLoaded", () => {
    loadProjects();
    
    
   
});

//acceder al proyecto


// function actualizarIndicador(password) {
//     const { fuerza, feedback } = validarContrasena(password);
//     const barra = document.getElementById("passwordStrength");
//     const texto = document.getElementById("passwordFeedback");

//     const porcentajes = [0, 20, 40, 60, 80, 100];
//     barra.style.width = porcentajes[fuerza] + "%";

//     if (fuerza <= 2) {
//         barra.className = "progress-bar bg-danger";
//         texto.textContent = feedback.join(", ");
//     } else if (fuerza <= 4) {
//         barra.className = "progress-bar bg-warning";
//         texto.textContent = feedback.join(", ");
//     } else {
//         barra.className = "progress-bar bg-success";
//         texto.textContent = "Contraseña segura ✔";
//     }
// }



// function generarContrasena(longitud = 12) {
//     const mayus = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
//     const minus = "abcdefghijklmnopqrstuvwxyz";
//     const numeros = "0123456789";
//     const simbolos = "!@#$%^&*()_+[]{}<>?,.";

//     const todo = mayus + minus + numeros + simbolos;

//     let password = "";
//     password += mayus[Math.floor(Math.random() * mayus.length)];
//     password += minus[Math.floor(Math.random() * minus.length)];
//     password += numeros[Math.floor(Math.random() * numeros.length)];
//     password += simbolos[Math.floor(Math.random() * simbolos.length)];

//     for (let i = 4; i < longitud; i++) {
//         password += todo[Math.floor(Math.random() * todo.length)];
//     }

//     return password.split('').sort(() => Math.random() - 0.5).join('');
// }

// // Generar contraseña
// document.getElementById("generatePassword").addEventListener("click", () => {
//     const nuevaPass = generarContrasena();
//     const inputPass = document.getElementById("password");
//     inputPass.value = nuevaPass;
//     actualizarIndicador(nuevaPass);
// });

// // Mostrar/ocultar contraseña
// document.getElementById("togglePassword").addEventListener("click", () => {
//     const inputPass = document.getElementById("password");
//     inputPass.type = inputPass.type === "password" ? "text" : "password";
// });