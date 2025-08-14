document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: email, password })
    });

    const data = await res.json();
    if (data.status === "ok") {
        window.location.href = data.redirect;
    } else {
        alert(data.message);
    }
});
