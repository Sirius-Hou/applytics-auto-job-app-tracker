import 'dotenv/config';
import { createSchema, eventSchema, type Application } from '../../shared/contracts.js';
import {
  addEvent,
  createApplication,
  deleteApplication,
  deleteEvent,
  getApplication,
} from '../repositories/applications.js';
import { pool } from './pool.js';

const sourceEmail = 'admin@gmail.com';
const targetEmail = 'siriushyc@gmail.com';
const createdIds: string[] = [];

const comparable = (application: Application) => ({
  job: application.job,
  status: application.status,
  customStatusName: application.customStatusName,
  appliedAt: application.appliedAt,
  notes: application.notes,
  events: application.events.map(({ type, customStatusName, occurredAt, notes }) => ({
    type,
    customStatusName,
    occurredAt,
    notes,
  })),
});

try {
  const users = await pool.query<{ id: string; email: string }>(
    'SELECT id,email FROM users WHERE lower(email) IN (lower($1),lower($2))',
    [sourceEmail, targetEmail],
  );
  const source = users.rows.find((user) => user.email.toLowerCase() === sourceEmail);
  const target = users.rows.find((user) => user.email.toLowerCase() === targetEmail);
  if (!source || !target) throw new Error('Both source and target accounts must already exist.');

  const targetCount = await pool.query<{ count: string }>(
    'SELECT count(*) FROM applications WHERE user_id=$1',
    [target.id],
  );
  if (targetCount.rows[0].count !== '0')
    throw new Error(`Target account is not empty: ${targetCount.rows[0].count} applications.`);

  const sourceIds = await pool.query<{ id: string }>(
    'SELECT id FROM applications WHERE user_id=$1 ORDER BY created_at,id',
    [source.id],
  );
  const sourceApplications = (
    await Promise.all(sourceIds.rows.map(({ id }) => getApplication(source.id, id)))
  ).filter((application): application is Application => application !== null);
  if (sourceApplications.length !== sourceIds.rowCount)
    throw new Error('Could not load every source application.');

  for (const application of sourceApplications) {
    const created = await createApplication(
      target.id,
      createSchema.parse({
        job: application.job,
        status: application.status,
        appliedAt: application.appliedAt,
        notes: application.notes,
      }),
    );
    createdIds.push(created.id);
    await deleteEvent(target.id, created.id, created.events[0].id);
    for (const event of [...application.events].reverse())
      await addEvent(target.id, created.id, eventSchema.parse(event));
  }

  const copiedApplications = (
    await Promise.all(createdIds.map((id) => getApplication(target.id, id)))
  ).filter((application): application is Application => application !== null);
  if (
    JSON.stringify(sourceApplications.map(comparable)) !==
    JSON.stringify(copiedApplications.map(comparable))
  )
    throw new Error('Copied application data does not match the source.');

  console.log(
    JSON.stringify({
      source: sourceEmail,
      target: targetEmail,
      applications: copiedApplications.length,
      events: copiedApplications.reduce((total, application) => total + application.events.length, 0),
    }),
  );
} catch (error) {
  const target = await pool.query<{ id: string }>('SELECT id FROM users WHERE lower(email)=lower($1)', [
    targetEmail,
  ]);
  for (const id of createdIds.reverse())
    if (target.rows[0]) await deleteApplication(target.rows[0].id, id).catch(() => undefined);
  throw error;
} finally {
  await pool.end();
}
