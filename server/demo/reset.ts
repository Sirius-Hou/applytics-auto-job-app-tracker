import { createSchema, eventSchema, type Application } from '../../shared/contracts.js';
import { pool } from '../db/pool.js';
import {
  addEvent,
  createApplication,
  deleteApplication,
  deleteEvent,
  getApplication,
} from '../repositories/applications.js';

const demoEmail = 'demo@test.com';

export async function resetDemoAccount() {
  const lockClient = await pool.connect();
  await lockClient.query("SELECT pg_advisory_lock(hashtext('applytics-demo-reset'))");
  try {
    const userResult = await pool.query<{ id: string }>('SELECT id FROM users WHERE email=$1', [
      demoEmail,
    ]);
    const userId = userResult.rows[0]?.id;
    if (!userId) throw Object.assign(new Error('Demo account is not seeded'), { status: 503 });

    const snapshotResult = await pool.query<{ applications: Application[] }>(
      'SELECT applications FROM demo_snapshots WHERE email=$1',
      [demoEmail],
    );
    if (!snapshotResult.rowCount) {
      const ids = await pool.query<{ id: string }>(
        'SELECT id FROM applications WHERE user_id=$1 ORDER BY created_at,id',
        [userId],
      );
      const applications = (
        await Promise.all(ids.rows.map(({ id }) => getApplication(userId, id)))
      ).filter((application): application is Application => application !== null);
      if (applications.length !== 20)
        throw Object.assign(
          new Error(`Expected 20 baseline applications, found ${applications.length}`),
          {
            status: 409,
          },
        );
      await pool.query('INSERT INTO demo_snapshots(email,applications) VALUES($1,$2)', [
        demoEmail,
        JSON.stringify(applications),
      ]);
      return { restored: applications.length, captured: true };
    }

    const currentIds = await pool.query<{ id: string }>(
      'SELECT id FROM applications WHERE user_id=$1',
      [userId],
    );
    for (const { id } of currentIds.rows) await deleteApplication(userId, id);

    for (const application of snapshotResult.rows[0].applications) {
      const created = await createApplication(
        userId,
        createSchema.parse({
          job: application.job,
          status: application.status,
          appliedAt: application.appliedAt,
          notes: application.notes,
        }),
      );
      await deleteEvent(userId, created.id, created.events[0].id);
      for (const event of [...application.events].reverse())
        await addEvent(userId, created.id, eventSchema.parse(event));
    }
    return { restored: snapshotResult.rows[0].applications.length, captured: false };
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock(hashtext('applytics-demo-reset'))");
    lockClient.release();
  }
}
