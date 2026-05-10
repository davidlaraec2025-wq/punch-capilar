// Ejecutar localmente: node import-google-contacts.js contacts.vcf [contacts2.vcf ...]
// Si no se pasan argumentos, busca todos los .vcf en la carpeta actual.
//
// Flujo:
//   1. Parsea números de teléfono de los archivos .vcf
//   2. Normaliza a formato JID WhatsApp (593XXXXXXXXX@s.whatsapp.net)
//   3. Fusiona con known-jids-export.txt existente
//   4. Regenera known-jids-seed.txt para Railway

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';

// ─── 1. Localizar archivos .vcf ───────────────────────────────────────────
let vcfFiles = process.argv.slice(2).filter(f => f.endsWith('.vcf'));

if (vcfFiles.length === 0) {
  vcfFiles = readdirSync('.').filter(f => f.endsWith('.vcf'));
}

if (vcfFiles.length === 0) {
  console.error('No se encontraron archivos .vcf.');
  console.error('Exporta desde contacts.google.com → Exportar → vCard (.vcf)');
  console.error('Coloca el archivo en esta carpeta y vuelve a ejecutar.');
  process.exit(1);
}

console.log(`Archivos .vcf encontrados: ${vcfFiles.join(', ')}\n`);

// ─── 2. Parsear números de teléfono ──────────────────────────────────────
function normalizarNumero(raw) {
  // Quitar todo menos dígitos y +
  let n = raw.replace(/[^\d+]/g, '');

  // Quitar + inicial
  if (n.startsWith('+')) n = n.slice(1);

  // Ecuador local: 09XXXXXXXX (10 dígitos) → 5939XXXXXXXX
  if (/^09\d{8}$/.test(n)) return '593' + n.slice(1);

  // Ecuador local sin cero: 9XXXXXXXX (9 dígitos) → 5939XXXXXXXX
  if (/^9\d{8}$/.test(n)) return '593' + n;

  // Ya tiene prefijo Ecuador: 593XXXXXXXXX
  if (/^593\d{9}$/.test(n)) return n;

  // Número muy corto o interno — descartar
  if (n.length < 7) return null;

  // Otros países: usar tal cual (10+ dígitos)
  if (n.length >= 10) return n;

  return null;
}

const numerosNuevos = new Set();
let tarjetasTotales = 0;

for (const archivo of vcfFiles) {
  const contenido = readFileSync(archivo, 'utf8');
  const tarjetas  = contenido.split(/BEGIN:VCARD/i).slice(1);
  tarjetasTotales += tarjetas.length;

  for (const tarjeta of tarjetas) {
    // Captura líneas TEL con su valor
    const lineasTel = tarjeta.match(/^TEL[^\r\n]*/gmi) || [];
    for (const linea of lineasTel) {
      const valor = linea.split(':').slice(1).join(':').trim();
      const norm  = normalizarNumero(valor);
      if (norm) numerosNuevos.add(norm);
    }

    // También captura WAID (número WhatsApp explícito en algunos exportadores)
    const waidMatch = tarjeta.match(/WAID=(\d+)/i);
    if (waidMatch) numerosNuevos.add(waidMatch[1]);
  }
}

console.log(`Tarjetas procesadas : ${tarjetasTotales}`);
console.log(`Números extraídos   : ${numerosNuevos.size}\n`);

// ─── 3. Fusionar con known-jids-export.txt existente ─────────────────────
const EXPORT_FILE = 'known-jids-export.txt';
const jidsExistentes = existsSync(EXPORT_FILE)
  ? new Set(readFileSync(EXPORT_FILE, 'utf8').split(',').map(j => j.trim()).filter(Boolean))
  : new Set();

const antesCount = jidsExistentes.size;

for (const numero of numerosNuevos) {
  jidsExistentes.add(`${numero}@s.whatsapp.net`);
}

const nuevosAgregados = jidsExistentes.size - antesCount;
console.log(`JIDs antes          : ${antesCount}`);
console.log(`JIDs nuevos         : ${nuevosAgregados}`);
console.log(`JIDs total          : ${jidsExistentes.size}\n`);

// ─── 4. Guardar known-jids-export.txt actualizado ────────────────────────
const csvActualizado = [...jidsExistentes].join(',');
writeFileSync(EXPORT_FILE, csvActualizado, 'utf8');
console.log(`✓ known-jids-export.txt actualizado (${jidsExistentes.size} JIDs)`);

// ─── 5. Regenerar known-jids-seed.txt para Railway ───────────────────────
const CHUNK = 30000;
const b64   = Buffer.from(csvActualizado).toString('base64');
const parts = [];
for (let i = 0; i < b64.length; i += CHUNK) parts.push(b64.slice(i, i + CHUNK));

const lines = parts.map((p, i) => `KNOWN_JIDS_SEED_${i + 1}=${p}`).join('\n');
writeFileSync('known-jids-seed.txt', lines, 'utf8');

console.log(`✓ known-jids-seed.txt regenerado`);
console.log(`  Base64 sin compresión : ${(b64.length / 1024).toFixed(1)} KB`);
console.log(`  Partes Railway        : ${parts.length}`);
parts.forEach((p, i) => console.log(`  KNOWN_JIDS_SEED_${i + 1}: ${p.length} chars`));
console.log('\nPega los valores de known-jids-seed.txt en Railway y redesplega.');
