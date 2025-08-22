//Agregue esto 
const { startAuthentication, startRegistration, browserSupportsWebAuthn } = SimpleWebAuthnBrowser;

document.getElementById("togglePassword").addEventListener("click", () => {
    const inputPass = document.getElementById("password");
    inputPass.type = inputPass.type === "password" ? "text" : "password";
});
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.status === "ok") {
        localStorage.setItem("userEmail", email); // <--- Guardar email
        window.location.href = data.redirect;
        
    } else {
        alert(data.message);
    }
});

function arrayBufferToBase64Url(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(base64urlString) {
  const padding = '='.repeat((4 - (base64urlString.length % 4)) % 4);
  const base64 = base64urlString.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

// Evento del botón
document.getElementById("login-passkey-btn").addEventListener("click", async () => {
    const email = document.getElementById("email-passkey").value.trim();
    if (!email) {
        alert("Por favor ingresa tu correo electrónico");
        return;
    }
    if (!window.PublicKeyCredential) {
        alert('Tu navegador no soporta WebAuthn');
        }
    try {
        // Pedimos challenge y passkeys al backend
        const res = await fetch("/webauthn/login-challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        
        const { options } = await res.json();

        if (!options || !options.allowCredentials || options.allowCredentials.length === 0) {
            alert("No se encontraron passkeys registradas para este usuario");
            return;
        }

        console.log(options.allowCredentials);
        // Mostramos el prompt de autenticación (Touch ID, Windows Hello...)
        //const cred = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: optionsFixed });
        const cred = await startAuthentication({ optionsJSON: options});

        // Verificamos en backend
        const verifyRes = await fetch("/webauthn/login-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, cred})
        });

        const result = await verifyRes.json();

        if (result.success) {
            const res = await fetch("/api/loginPasskey", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (data.status === "ok") {
                localStorage.setItem("userEmail", email); // <--- Guardar email
                window.location.href = data.redirect;
                
            } else {
                alert(data.message);
            }
        } else {
            alert(result.message || "Error en autenticación con Passkey");
        }

    } catch (err) {
        console.error("Error en login con passkey:", err);
        alert("Fallo en la autenticación con Passkey");
    }
});

//boton dinamico passkey 
const btnShow = document.getElementById("show-passkey");
const passkeyDiv = document.getElementById("passkey-container");

btnShow.addEventListener("click", () => {
    passkeyDiv.style.display = "block";  
    btnShow.style.display = "none";      
});

