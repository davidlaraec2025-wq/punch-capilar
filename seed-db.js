import { addJids, countJids } from './db/jids.js';

export function seedDb() {
  const n = countJids();
  if (n > 0) {
    console.log(`[SEED] DB ya tiene ${n} JIDs — omitiendo seed`);
    return;
  }

  const parts = [];
  for (let i = 1; ; i++) {
    const p = process.env[`KNOWN_JIDS_SEED_${i}`];
    if (!p) break;
    parts.push(p);
  }

  if (parts.length === 0) {
    console.log('[SEED] No hay KNOWN_JIDS_SEED_* — iniciando con DB vacía');
    return;
  }

  try {
    const csv  = Buffer.from(parts.join(''), 'base64').toString('utf8');
    const jids = csv.split(',').map(j => j.trim()).filter(Boolean);
    addJids(jids);
    console.log(`[SEED] Insertados ${jids.length} JIDs en DB`);
  } catch (err) {
    console.error(`[SEED] Error al decodificar seed — arrancando con DB vacía: ${err.message}`);
  }
}
