import 'dotenv/config';
import type { Response } from 'express';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSchema, eventSchema, type Application } from '../../shared/contracts.js';
import { registerWithPassword } from '../auth.js';
import { addEvent, createApplication, deleteEvent } from '../repositories/applications.js';
import { pool } from './pool.js';

const backupName = (await readdir(resolve('backups')))
  .filter((name) => /^admin-demo-.*\.json$/.test(name))
  .sort()
  .at(-1);
if (!backupName) throw new Error('No admin demo backup found in backups/.');

const backup = JSON.parse(await readFile(resolve('backups', backupName), 'utf8')) as {
  applications: Application[];
};
if (backup.applications.length !== 20)
  throw new Error(`Expected 20 demo applications, found ${backup.applications.length}.`);

const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE email=$1', [
  'demo@test.com',
]);
if (existing.rowCount) {
  const count = await pool.query<{ count: string }>(
    'SELECT count(*) FROM applications WHERE user_id=$1',
    [existing.rows[0].id],
  );
  if (count.rows[0].count !== '20')
    throw new Error(
      `Demo account already exists with ${count.rows[0].count} applications; no existing data was changed.`,
    );
  console.log('Demo account is already seeded with 20 applications.');
  await pool.end();
  process.exit(0);
}

const user = await registerWithPassword(
  { email: 'demo@test.com', password: 'THISISADEMO', displayName: 'demo' },
  { setHeader: () => undefined } as unknown as Response,
);

for (const application of backup.applications) {
  const created = await createApplication(
    user.id,
    createSchema.parse({
      job: application.job,
      status: application.status,
      appliedAt: application.appliedAt,
      notes: application.notes,
    }),
  );
  await deleteEvent(user.id, created.id, created.events[0].id);
  for (const event of [...application.events].reverse())
    await addEvent(user.id, created.id, eventSchema.parse(event));
}

console.log(`Seeded demo@test.com with ${backup.applications.length} applications.`);
await pool.end();
