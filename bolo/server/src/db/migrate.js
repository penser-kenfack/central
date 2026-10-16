import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { pool } from './index.js';

export async function migrate() {
  const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate().then(() => { console.log('Schema up to date'); return pool.end(); })
    .catch((err) => { console.error(err); process.exit(1); });
}
