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
        // 1️⃣ Pedimos challenge y passkeys al backend
        const res = await fetch("/webauthn/login-challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
/*
        const challengeResult = await res.json();
        console.log(challengeResult);
        const { options } = challengeResult;

        if (!options.allowCredentials || options.allowCredentials.length === 0) {
            alert("No se encontraron passkeys registradas para este usuario");
            return;
            }

        console.log('Opciones recibidas:', options);
        const authenticationResult = await SimpleWebAuthnBrowser.startAuthentication(options);
        console.log(authenticationResult);

        await fetch("/webauthn/login-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, cred: authenticationResult })
        }); 

        //Voy a comentar esto para probar
 */
        
        const { options } = await res.json();

        if (!options || !options.allowCredentials || options.allowCredentials.length === 0) {
            alert("No se encontraron passkeys registradas para este usuario");
            return;
        }
            //llega hasta aqui

        // 2️⃣ Convertimos allowCredentials.id y challenge a Uint8Array
        /*
        const optionsFixed = {
            ...options,
            allowCredentials: options.allowCredentials.map(cred => ({
                ...cred,
                id: Uint8Array.from(
                    atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')),
                    c => c.charCodeAt(0)
                )
            })),
            challenge: Uint8Array.from(
                atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')),
                c => c.charCodeAt(0)
            )
        };
        */
        //y esto 
        
        //Esto convierte en BUFFER
        /*
        options.allowCredentials = options.allowCredentials.map(cred => ({
        ...cred,
            id: base64UrlToArrayBuffer(cred.id)  // 🔑 convertir a ArrayBuffer
        }));
        */

        console.log(options.allowCredentials);
        // 3️⃣ Mostramos el prompt de autenticación (Touch ID, Windows Hello...)
        //const cred = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: optionsFixed });
        const cred = await startAuthentication({ optionsJSON: options});

        // 4️⃣ Convertimos cred.id y cred.rawId a Base64URL antes de enviarlo al backend
        /*
        const credToSend = {
            ...cred,
            id: arrayBufferToBase64Url(cred.id),
            rawId: arrayBufferToBase64Url(cred.rawId)
        };*/

        // 5️⃣ Verificamos en backend
        const verifyRes = await fetch("/webauthn/login-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, cred})
        });

        const result = await verifyRes.json();

        if (result.success) {
            localStorage.setItem("userEmail", email);
            window.location.href = "/profile";
        } else {
            alert(result.message || "Error en autenticación con Passkey");
        }
            
        

    } catch (err) {
        console.error("Error en login con passkey:", err);
        alert("Fallo en la autenticación con Passkey");
    }
     /*  
    }catch (err) {
        console.error("Error en login con passkey:", err);
        if (err.name === "NotAllowedError") {
            alert("La operación fue cancelada o no permitida. Intenta de nuevo.");
        } else {
            alert("Fallo en la autenticación con Passkey");
        }
    }*/
});