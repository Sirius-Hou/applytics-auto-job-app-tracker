import 'dotenv/config';
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
// Optional portable PostgreSQL for local development. Standard PostgreSQL works too.
const databaseDir = resolve('.local/postgres');
if (!process.env.DATABASE_URL) {
  if (existsSync('.env'))
    throw Error('Set DATABASE_URL in the existing .env before running db:local.');
  const password = randomBytes(24).toString('hex');
  process.env.DATABASE_URL = `postgresql://tracker:${password}@127.0.0.1:55432/job_tracker`;
  await writeFile('.env', `DATABASE_URL=${process.env.DATABASE_URL}\nPORT=3001\nHOST=127.0.0.1\n`, {
    flag: 'wx',
  });
}
const url = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432')
  throw Error(
    'db:local requires a localhost DATABASE_URL on port 55432. For an existing PostgreSQL installation use npm run migrate directly.',
  );
await mkdir(resolve('.local'), { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: 55432,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const dbName = url.pathname.slice(1);
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName))
  throw Error('Use a simple database name in DATABASE_URL.');
if (!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName])).rowCount)
  await pg.createDatabase(dbName);
await client.end();
const { migrate } = await import('./migrate.js');
await migrate();
const { pool } = await import('./pool.js');
await pool.end();
console.log('Local PostgreSQL is ready on 127.0.0.1:55432. Keep this terminal running.');
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 60000);
