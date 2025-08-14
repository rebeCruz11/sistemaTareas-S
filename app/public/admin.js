document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include" //enviar la cookie al backend
    });
    localStorage.removeItem("token");
    window.location.href = "/";
  } catch (err) {
    console.error("Error al cerrar sesión", err);
  }
});
