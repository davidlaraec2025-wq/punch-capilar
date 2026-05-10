// Reconstruye auth_info_baileys/ desde la variable de entorno BAILEYS_AUTH_DATA.
// Se ejecuta al arrancar en Railway. En local, si la carpeta ya existe, no hace nada.
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { gunzipSync } from 'zlib';
import { join } from 'path';

export function setupAuth() {
  // Reúne partes BAILEYS_AUTH_DATA_1, _2, _3... en orden
  const parts = [];
  for (let i = 1; ; i++) {
    const part = process.env[`BAILEYS_AUTH_DATA_${i}`];
    if (!part) break;
    parts.push(part);
  }

  if (parts.length === 0) return; // dev local — usa carpeta existente

  const b64        = parts.join('');
  const compressed = Buffer.from(b64, 'base64');
  const json       = gunzipSync(compressed).toString('utf8');
  const files      = JSON.parse(json);

  const dir = 'auth_info_baileys';
  if (!existsSync(dir)) mkdirSync(dir);

  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(dir, filename), content, 'utf8');
  }

  console.log(`[AUTH] Restaurados ${Object.keys(files).length} archivos desde ${parts.length} partes`);
}
