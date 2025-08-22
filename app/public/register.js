function validarUsuario(usuario) {
    const feedback = [];

    if (usuario.length < 3 || usuario.length > 20) {
        feedback.push("Debe tener entre 3 y 20 caracteres");
    }
    if (!/^[a-zA-Z0-9._]+$/.test(usuario)) {
        feedback.push("Solo se permiten letras, números, puntos y guiones bajos");
    }
    if (/^[._]/.test(usuario)) {
        feedback.push("No puede comenzar con punto o guion bajo");
    }
    if (/[._]$/.test(usuario)) {
        feedback.push("No puede terminar con punto o guion bajo");
    }
    if (/(\.\.|__)/.test(usuario)) {
        feedback.push("No puede tener puntos o guiones bajos consecutivos");
    }

    return {
        valido: feedback.length === 0,
        feedback
    };
}


function validarContrasena(password) {
    let fuerza = 0;
    const feedback = [];

    if (password.length >= 12) fuerza++;
    else feedback.push("Mínimo 12 caracteres");

    if (/[A-Z]/.test(password)) fuerza++;
    else feedback.push("Debe incluir mayúsculas");

    if (/[a-z]/.test(password)) fuerza++;
    else feedback.push("Debe incluir minúsculas");

    if (/[0-9]/.test(password)) fuerza++;
    else feedback.push("Debe incluir números");

    if (/[^A-Za-z0-9]/.test(password)) fuerza++;
    else feedback.push("Debe incluir símbolos");

    return { fuerza, feedback };
}

function actualizarIndicador(password) {
    const { fuerza, feedback } = validarContrasena(password);
    const barra = document.getElementById("passwordStrength");
    const texto = document.getElementById("passwordFeedback");

    const porcentajes = [0, 20, 40, 60, 80, 100];
    barra.style.width = porcentajes[fuerza] + "%";

    if (fuerza <= 2) {
        barra.className = "progress-bar bg-danger";
        texto.textContent = feedback.join(", ");
    } else if (fuerza <= 4) {
        barra.className = "progress-bar bg-warning";
        texto.textContent = feedback.join(", ");
    } else {
        barra.className = "progress-bar bg-success";
        texto.textContent = "Contraseña segura ✔";
    }
}

// Mostrar/ocultar contraseña
document.getElementById("togglePassword").addEventListener("click", () => {
    const inputPass = document.getElementById("password");
    inputPass.type = inputPass.type === "password" ? "text" : "password";
});

// Validar en vivo cuando se escribe
document.getElementById("password").addEventListener("input", (e) => {
    actualizarIndicador(e.target.value);
});

document.getElementById("user").addEventListener("input", (e) => {
    const { valido, feedback } = validarUsuario(e.target.value);
    const msg = document.getElementById("userFeedback");
    msg.textContent = valido ? "" : feedback.join(", ");
    msg.style.color = valido ? "green" : "red";
});


// Validar antes de enviar el formulario
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const user = document.getElementById("user").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

     // Validar usuario
    const { valido, feedback: userFeedback } = validarUsuario(user);
    if (!valido) {
        alert("Nombre de usuario inválido:\n" + userFeedback.join("\n"));
        return;
    }

    const { fuerza } = validarContrasena(password);
    if (fuerza < 5) {
        alert("La contraseña no cumple con los requisitos de seguridad.");
        return;
    }

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, email, password })
    });

    const data = await res.json();
    if (data.status === "ok") {
         localStorage.setItem("emailRegistro", email); 
        window.location.href = data.redirect;
    } else {
        alert(data.message);
    }
});
