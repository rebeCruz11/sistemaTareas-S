import express from 'express';

// Sirve para el _dirname 
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {methods as authentication} from './controllers/authentication.controller.js';
//server

const app = express();
app.set('port', 3000);
app.listen(app.get('port'));
console.log(`Server is listening at http://localhost:${app.get('port')}`);


//Configuración 
app.use(express.static(__dirname + '/public'));




//rutas 
app.get('/', (req, res) => res.sendFile(__dirname + "/pages/login.html"));
app.get('/register', (req, res) => res.sendFile(__dirname + "/pages/register.html"));
app.get('/admin', (req, res) => res.sendFile(__dirname + "/pages/admin/admin.html"));
app.get('/api/register', authentication.register);
app.get('/api/login', authentication.login);

