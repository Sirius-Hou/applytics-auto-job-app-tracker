import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
});

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const directory = resolve('backups');
const destination = resolve(directory, `applytics-data-${stamp}.json`);
const temporary = `${destination}.tmp`;

await mkdir(directory, { recursive: true });
await client.connect();

try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tableResult = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const { table_name: table } of tableResult.rows) {
    const result = await client.query(`SELECT * FROM ${pg.escapeIdentifier(table)}`);
    tables[table] = result.rows;
    counts[table] = result.rowCount ?? result.rows.length;
  }
  await client.query('COMMIT');

  const payload = {
    format: 'applytics-postgresql-data-v1',
    createdAt: new Date().toISOString(),
    source: 'Supabase PostgreSQL public schema',
    counts,
    tables,
  };
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  const checksum = createHash('sha256').update(serialized).digest('hex');
  await writeFile(temporary, serialized, { encoding: 'utf8', flag: 'wx' });
  await rename(temporary, destination);
  await writeFile(`${destination}.sha256`, `${checksum}  ${destination.split(/[\\/]/).at(-1)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });

  console.log(JSON.stringify({ destination, checksum, counts }, null, 2));
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
