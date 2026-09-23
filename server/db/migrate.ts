import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool, transaction } from './pool.js';
export async function migrate() {
  await transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(72198412)');
    await c.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const dir = new URL('./migrations/', import.meta.url);
    for (const name of (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort()) {
      if ((await c.query('SELECT 1 FROM schema_migrations WHERE version=$1', [name])).rowCount)
        continue;
      await c.query(await readFile(new URL(name, dir), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES($1)', [name]);
      console.log(`Applied ${name}`);
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
