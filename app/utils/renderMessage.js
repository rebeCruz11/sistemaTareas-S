export default function renderMessage({ title, message, color, link, linkText }) {
    const isSuccess = color === "success";
    const mainColor = isSuccess ? "#16a34a" : "#dc2626";
    const hoverColor = isSuccess ? "#15803d" : "#b91c1c";
    const icon = isSuccess
        ? `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2" stroke="${mainColor}" fill="${mainColor}20"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" stroke="${mainColor}"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2" stroke="${mainColor}" fill="${mainColor}20"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9l6 6M15 9l-6 6" stroke="${mainColor}"/></svg>`;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background-color: #f9fafb;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .card {
                background: white;
                padding: 40px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                max-width: 420px;
                width: 100%;
            }
            .icon {
                width: 64px;
                height: 64px;
                margin-bottom: 16px;
            }
            h1 {
                color: ${mainColor};
                font-size: 1.5rem;
                margin: 0 0 12px;
            }
            p {
                color: #4b5563;
                font-size: 1rem;
                margin: 0 0 20px;
            }
            a {
                display: inline-block;
                background: ${mainColor};
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                transition: background 0.2s ease;
            }
            a:hover {
                background: ${hoverColor};
            }
        </style>
    </head>
    <body>
        <div class="card">
            ${icon}
            <h1>${title}</h1>
            <p>${message}</p>
            ${link ? `<a href="${link}">${linkText || "Volver"}</a>` : ""}
        </div>
    </body>
    </html>
    `;
}
