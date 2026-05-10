// Corre LOCALMENTE para generar BAILEYS_AUTH_DATA
// node encode-auth.js

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { join } from 'path';

const DIR = 'auth_info_baileys';
const files = readdirSync(DIR);

// Solo los archivos esenciales para reconectar sin QR
const essential = files.filter(f =>
  f === 'creds.json' ||
  f.startsWith('pre-key-') ||
  f.startsWith('app-state-sync-key-') ||
  f.startsWith('app-state-sync-version-')
);

const data = {};
essential.forEach(f => {
  data[f] = readFileSync(join(DIR, f), 'utf8');
});

const json       = JSON.stringify(data);
const compressed = gzipSync(Buffer.from(json));
const b64        = compressed.toString('base64');

const CHUNK = 30000;
const parts = [];
for (let i = 0; i < b64.length; i += CHUNK) {
  parts.push(b64.slice(i, i + CHUNK));
}

console.log(`\nArchivos incluidos: ${essential.length}`);
console.log(`Tamaño base64: ${(b64.length / 1024).toFixed(1)} KB`);
console.log(`Partes generadas: ${parts.length} (máx ${CHUNK} chars c/u)\n`);
console.log('─'.repeat(60));
console.log('Agrega estas variables en Railway:\n');
parts.forEach((part, i) => {
  console.log(`BAILEYS_AUTH_DATA_${i + 1}=${part}\n`);
});
console.log('─'.repeat(60));

const lines = parts.map((part, i) => `BAILEYS_AUTH_DATA_${i + 1}=${part}`).join('\n');
writeFileSync('baileys-auth-data.txt', lines);
console.log(`\nValores guardados en: baileys-auth-data.txt (${parts.length} partes)`);
