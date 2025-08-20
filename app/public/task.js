let projectId = new URLSearchParams(window.location.search).get("projectId");
let selectedTaskId = null;

// Cargar usuarios para el modal de asignación
async function loadUsers() {
    try {
        const res = await fetch(`http://localhost:4000/api/users`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const users = await res.json();

        const userSelect = document.getElementById("userSelect");
        userSelect.innerHTML = '<option value="">-- Selecciona un usuario --</option>';

        users.forEach(user => {
            const option = document.createElement("option");
            option.value = user._id; // Asegúrate que sea el id correcto del backend
            option.textContent = user.user; // Nombre del usuario
            userSelect.appendChild(option);
        });
    } catch (err) {
        console.error("Error cargando usuarios:", err);
    }
}

// Abrir el modal para crear una nueva tarea
function openTaskModal() {
    const modal = document.getElementById("taskModal");
    document.getElementById("modalTitle").innerHTML = `
        <i class="fas fa-plus-circle me-2"></i> Nueva Tarea
    `;

    // Reiniciar formulario
    document.getElementById("taskForm").reset();

    modal.classList.add("show");
}

// Cerrar el modal
function closeTaskModal() {
    const modal = document.getElementById("taskModal");
    modal.classList.remove("show");
}


// Cargar tareas dinámicamente según projectId
async function loadTasks() {
    if (!projectId) {
        console.error("No se proporcionó projectId");
        return;
    }

    try {
        const res = await fetch(`/api/tasks?projectId=${projectId}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const tasks = await res.json();

        const tasksContainer = document.getElementById("taskItems");
        tasksContainer.innerHTML = "";

        tasks.forEach(task => {
            const card = document.createElement("div");
            card.className = "card mb-3 shadow-sm";

            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${task.titulo}</h5>
                    <p class="card-text">${truncateText(task.descripcion, 150)}</p>
                    
                    <p class="card-text"><strong>Estado:</strong> 
                        <span class="${getStatusClass(task.estado)}">${task.estado}</span>
                    </p>
                    
                    <p class="card-text"><strong>Prioridad:</strong> 
                        <span class="${getPriorityClass(task.prioridad)}">${task.prioridad}</span>
                    </p>
                    
                    <p class="card-text"><strong>Fecha Límite:</strong> ${formatDate(task.fechaLimite)}</p>
                    
                    <p class="card-text"><strong>Asignado a:</strong> ${task.asignadoA ? task.asignadoA.user : "No asignado"}</p>

                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-sm btn-primary" onclick="openAssignModal('${task._id}')">Asignar</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTask('${task._id}')">Eliminar</button>
                        <button class="btn btn-sm btn-secondary" onclick="editTask('${task._id}')">Editar</button>
                    </div>
                </div>
            `;

            tasksContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error al cargar tareas:", error);
    }
}

// Abrir modal para asignar usuario
function openAssignModal(taskId) {
    selectedTaskId = taskId;
    document.getElementById("taskId").value = taskId;
    loadUsers(); // cargar usuarios cada vez que se abre el modal

    const modalEl = document.getElementById("createTaskModal");
    const modal = new bootstrap.Modal(modalEl, { backdrop: false, keyboard: true });
    modal.show();
}

// Asignar usuario a tarea
document.getElementById("assignTaskForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("userSelect").value;

    if (!userId || !selectedTaskId) {
        alert("Selecciona un usuario válido");
        return;
    }

    try {
        const res = await fetch(`/api/tasks/${selectedTaskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: userId })
        });


        if (!res.ok) throw new Error("Error asignando usuario");

        await res.json();
        alert("Usuario asignado correctamente");
        bootstrap.Modal.getInstance(document.getElementById("createTaskModal")).hide();
        loadTasks();
        closeTaskModal();
    } catch (err) {
        console.error(err);
        alert("No se pudo asignar el usuario");
    }
});

// Helpers
function truncateText(text, length = 100) {
    return text.length <= length ? text : text.substring(0, length) + "...";
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function getStatusClass(status) {
    switch (status) {
        case "Pendiente": return "badge bg-secondary";
        case "En Progreso": return "badge bg-primary";
        case "Completada": return "badge bg-success";
        default: return "badge bg-light";
    }
}

function getPriorityClass(priority) {
    switch (priority) {
        case "Baja": return "badge bg-success";
        case "Media": return "badge bg-warning";
        case "Alta": return "badge bg-danger";
        case "Crítica": return "badge bg-dark";
        default: return "badge bg-light";
    }
}

function openTaskModal(){


}

// Formulario para agregar tarea
document.getElementById('taskForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    if (!projectId) {
        alert("No se pudo detectar el proyecto");
        return;
    }

    const taskData = {
        proyectoId: projectId,
        titulo: document.getElementById('taskName').value,
        descripcion: document.getElementById('taskDesc').value,
        prioridad: document.getElementById('taskPriority').value,
        fechaLimite: document.getElementById('taskDueDate').value
    };

    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        await res.json();
        alert("Tarea agregada!");
        document.getElementById('taskForm').reset();
        loadTasks();
    } catch (err) {
        console.error("Error agregando tarea:", err);
    }
});

// Inicializar tareas al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    loadTasks();
});
