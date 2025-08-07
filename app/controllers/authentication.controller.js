async function login(req, res) {
    // Aquí iría la lógica de autenticación

}

async function register(req, res) {
    // Aquí iría la lógica de registr
    console.log(req.body);

}

export const methods = {
    login,
    register
};