// Ejecutar localmente: node export-contacts.js
// Extrae JIDs desde los archivos session-* de auth_info_baileys/ — sin conexión a WhatsApp

import { readdirSync, writeFileSync } from 'fs';

const DIR = 'auth_info_baileys';
const files = readdirSync(DIR);

const jids = new Set();

for (const f of files) {
  // session-{número}.{index}.json → número individual
  const m = f.match(/^session-(\d+)\.\d+\.json$/);
  if (m) {
    const numero = m[1];
    // Filtrar números muy cortos (artefactos) y grupos
    if (numero.length >= 8) {
      jids.add(`${numero}@s.whatsapp.net`);
    }
  }
}

const lista = [...jids].join(',');
writeFileSync('known-jids-export.txt', lista, 'utf8');

console.log(`✓ Exportados ${jids.size} JIDs únicos → known-jids-export.txt`);
console.log(`Tamaño: ${(lista.length / 1024).toFixed(1)} KB`);
console.log('\nPega el contenido de known-jids-export.txt en la variable KNOWN_JIDS de Railway.');
