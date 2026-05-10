import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';

if (!existsSync('db')) mkdirSync('db');

const db = new Database('db/known-jids.db');
db.pragma('journal_mode = WAL');
db.prepare('CREATE TABLE IF NOT EXISTS jids (jid TEXT PRIMARY KEY)').run();

const stmtHas    = db.prepare('SELECT 1 FROM jids WHERE jid = ?');
const stmtInsert = db.prepare('INSERT OR IGNORE INTO jids (jid) VALUES (?)');
const stmtCount  = db.prepare('SELECT COUNT(*) AS n FROM jids');

export const isKnown   = (jid) => !!stmtHas.get(jid);
export const addJid    = (jid) => stmtInsert.run(jid);
export const countJids = ()    => stmtCount.get().n;

export function addJids(arr) {
  const tx = db.transaction((list) => {
    for (const jid of list) stmtInsert.run(jid);
  });
  tx(arr);
}
