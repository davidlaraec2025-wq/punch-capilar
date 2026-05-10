// Ejecutar localmente: node encode-seed.js
// Genera las variables KNOWN_JIDS_SEED_N para Railway a partir de known-jids-export.txt

import { readFileSync, writeFileSync } from 'fs';
import { gzipSync } from 'zlib';

const csv  = readFileSync('known-jids-export.txt', 'utf8');
const b64  = gzipSync(Buffer.from(csv)).toString('base64');

const CHUNK = 30000;
const parts = [];
for (let i = 0; i < b64.length; i += CHUNK) parts.push(b64.slice(i, i + CHUNK));

console.log(`JIDs: ${csv.split(',').filter(Boolean).length}`);
console.log(`Base64 comprimido: ${(b64.length / 1024).toFixed(1)} KB`);
console.log(`Partes generadas: ${parts.length}`);
console.log('');

parts.forEach((p, i) => console.log(`  KNOWN_JIDS_SEED_${i + 1}: ${p.length} chars`));

const lines = parts.map((p, i) => `KNOWN_JIDS_SEED_${i + 1}=${p}`).join('\n');
writeFileSync('known-jids-seed.txt', lines);
console.log('\nGuardado en: known-jids-seed.txt');
