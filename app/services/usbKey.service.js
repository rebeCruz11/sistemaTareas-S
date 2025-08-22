// app/services/usbKey.service.js
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Genera la "llave" del proyecto (texto aleatorio), su hash para guardar en BD,
 * y el contenido del archivo que irá en la USB.
 */
export function generateUsbKey(projectId) {
  const keyId = crypto.randomUUID();
  const plainKey = crypto.randomBytes(32).toString('base64url');
  const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
  const fileName = `project-${projectId}-${keyId}.key.json`;

  const fileContent = JSON.stringify(
    { projectId: String(projectId), keyId, key: plainKey },
    null,
    2
  );

  return { keyId, keyHash, fileName, fileContent };
}

/**
 * Escribe el archivo de la llave en la ruta de la USB.
 */
export async function writeKeyToUsb(usbPath, fileName, fileContent) {
  const fullPath = path.join(usbPath, fileName);
  await writeFile(fullPath, fileContent, { encoding: 'utf-8', flag: 'w' });
  return fullPath;
}

/**
 * Lee el archivo de la USB y devuelve su JSON.
 */
export async function readKeyFromUsb(usbPath, fileName) {
  const fullPath = path.join(usbPath, fileName);
  const content = await readFile(fullPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Verifica que la clave del archivo coincida con el hash almacenado en BD.
 */
export function verifyKey(plainKey, expectedHash) {
  const hash = crypto.createHash('sha256').update(plainKey).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}
