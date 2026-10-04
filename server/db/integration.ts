import EmbeddedPostgres from 'embedded-postgres';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const password = randomBytes(24).toString('hex');
const pg = new EmbeddedPostgres({
  databaseDir: resolve(`.local/test-${Date.now()}`),
  user: 'testuser',
  password,
  port: 55433,
  persistent: false,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});
await pg.initialise();
await pg.start();
await pg.createDatabase('tracker_test');
process.env.DATABASE_URL = `postgresql://testuser:${password}@127.0.0.1:55433/tracker_test`;
process.env.NODE_ENV = 'test';
process.env.APP_BASE_URL = 'http://127.0.0.1:5173';
const { migrate } = await import('./migrate.js');
const { pool } = await import('./pool.js');
const repo = await import('../repositories/applications.js');
const { createSchema, filterSchema } = await import('../../shared/contracts.js');
let server: ReturnType<(typeof import('../app.js'))['app']['listen']> | undefined;
try {
  await migrate();
  await migrate();
  assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count, '7');
  const userId = randomUUID();
  await pool.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)', [
    userId,
    'integration@example.com',
    'test-hash',
  ]);
  const rawJd =
    'Company: Example Labs\nTitle: Summer Engineer Intern\nLocations: Toronto, Ontario, CA; Vancouver, BC, CA; Seattle, WA, US\nMinimum Qualifications:\nC++\nPreferred Qualifications:\nLinux';
  const input = createSchema.parse({
    job: {
      rawJd,
      originalUrl: 'https://example.com/job',
      canonicalUrl: null,
      company: 'Example Labs',
      title: 'Summer Engineer Intern',
      category: 'INTERNSHIP',
      term: 'SUMMER',
      recruitingYear: null,
      workArrangement: 'ONSITE',
      locations: [
        { rawText: 'Toronto, Ontario, CA', city: 'Toronto', region: 'Ontario', countryCode: 'CA' },
        { rawText: 'Vancouver, BC, CA', city: 'Vancouver', region: 'BC', countryCode: 'CA' },
        { rawText: 'Seattle, WA, US', city: 'Seattle', region: 'WA', countryCode: 'US' },
      ],
      compensation: null,
      requirementSections: [
        { rawHeading: 'Minimum Qualifications:', type: 'MINIMUM', content: 'C++', displayOrder: 0 },
        {
          rawHeading: 'Preferred Qualifications:',
          type: 'PREFERRED',
          content: 'Linux',
          displayOrder: 1,
        },
      ],
      roleSummary: ['SYSTEMS', 'BACKEND'],
      keyRequirements: {
        minimum: ['C++'],
        preferred: ['Linux'],
      },
      skills: [
        { name: 'C++', type: 'PROGRAMMING_LANGUAGE', requirementType: 'MINIMUM' },
        { name: 'Linux', type: 'OPERATING_SYSTEM', requirementType: 'PREFERRED' },
        { name: 'Distributed Systems', type: 'TECHNICAL_DOMAIN', requirementType: 'OTHER' },
      ],
      experience: { minimumYears: 0, maximumYears: 3, rawText: '0-3 years' },
      parserModel: 'integration-model',
      parserVersion: 'v1',
    },
    appliedAt: '2026-09-01T12:00:00Z',
  });
  const a = await repo.createApplication(userId, input);
  assert.equal(a.job.rawJd, rawJd);
  assert.equal(a.job.locations.length, 3);
  assert.equal(a.events.length, 1);
  assert.deepEqual(a.job.keyRequirements, { minimum: ['C++'], preferred: ['Linux'] });
  assert.equal(a.job.skills.length, 3);
  assert.deepEqual(a.job.roleSummary, ['SYSTEMS', 'BACKEND']);
  assert.deepEqual(a.job.experience, {
    minimumYears: 0,
    maximumYears: 3,
    rawText: '0-3 years',
  });
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ country: 'CA' }))).total,
    1,
  );
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ country: 'CA,US' }))).total,
    1,
  );
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ country: 'US' }))).total,
    1,
  );
  assert.equal((await repo.listApplications(userId, filterSchema.parse({ q: 'Linux' }))).total, 1);
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ skill: 'C++' }))).total,
    1,
  );
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ skill: 'Python' }))).total,
    0,
  );
  const skillStats = await repo.listSkillStats(userId);
  assert.equal(skillStats.find((skill) => skill.name === 'C++')?.minimumCount, 1);
  assert.equal(skillStats.find((skill) => skill.name === 'Distributed Systems')?.otherCount, 1);
  assert.equal(
    (await repo.listRoleStats(userId)).find((role) => role.role === 'SYSTEMS')?.applicationCount,
    1,
  );
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ role: 'BACKEND' }))).total,
    1,
  );
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ title: 'Summer Engineer' }))).total,
    1,
  );
  assert.equal(
    (await repo.listApplications(userId, filterSchema.parse({ appliedWithin: '2y' }))).total,
    1,
  );
  const overview = await repo.getApplicationOverview(userId, {
    period: 'all',
    company: 'Example',
  });
  assert.equal(overview.totalApplications, 1);
  assert.equal(overview.countries.find((country) => country.countryCode === 'CA')?.count, 1);
  assert.equal(overview.countries.find((country) => country.countryCode === 'US')?.count, 1);
  assert.equal(overview.companies[0].name, 'Example Labs');
  assert.equal(overview.roles.find((role) => role.role === 'SYSTEMS')?.count, 1);
  assert.equal(
    (
      await repo.listApplications(
        userId,
        filterSchema.parse({ from: '2026-09-01', to: '2026-09-01' }),
      )
    ).total,
    1,
  );
  await repo.addEvent(userId, a.id, {
    type: 'OFFER',
    occurredAt: '2026-09-20T12:00:00Z',
    notes: 'Offer received',
  });
  const backdated = await repo.addEvent(userId, a.id, {
    type: 'OA',
    occurredAt: '2026-09-10T12:00:00Z',
    notes: 'Historical OA',
  });
  assert.equal(backdated!.status, 'OFFER');
  assert.equal(backdated!.events.length, 3);
  await Promise.all([
    repo.addEvent(userId, a.id, {
      type: 'TECHNICAL_INTERVIEW',
      occurredAt: '2026-09-15T12:00:00Z',
      notes: 'Concurrent historical event',
    }),
    repo.addEvent(userId, a.id, {
      type: 'WITHDRAWN',
      occurredAt: '2026-09-21T12:00:00Z',
      notes: 'Latest event',
    }),
  ]);
  assert.equal((await repo.getApplication(userId, a.id))!.status, 'WITHDRAWN');
  assert.equal((await repo.getApplication(userId, a.id))!.events.length, 5);
  const oaEvent = (await repo.getApplication(userId, a.id))!.events.find(
    (event) => event.type === 'OA',
  )!;
  const editedEvent = await repo.updateEvent(userId, a.id, oaEvent.id, {
    type: 'REJECTED',
    occurredAt: '2026-09-22T12:00:00Z',
    notes: 'Corrected event',
  });
  assert.equal(editedEvent!.status, 'REJECTED');
  assert.equal(
    editedEvent!.events.find((event) => event.id === oaEvent.id)?.notes,
    'Corrected event',
  );
  const afterDelete = await repo.deleteEvent(userId, a.id, oaEvent.id);
  assert.equal(afterDelete!.status, 'WITHDRAWN');
  assert.equal(afterDelete!.events.length, 4);
  const updated = await repo.updateApplication(userId, a.id, {
    notes: 'Updated note',
    appliedAt: '2026-09-02T12:00:00Z',
  });
  assert.equal(updated!.events.length, 4);
  assert.equal(updated!.notes, 'Updated note');
  await repo.createApplication(userId, {
    ...input,
    job: { ...input.job, company: '  EXAMPLE   LABS  ' },
  });
  assert.equal((await pool.query('SELECT count(*) FROM companies')).rows[0].count, '1');
  const countBefore = (await pool.query('SELECT count(*) FROM jobs')).rows[0].count;
  await assert.rejects(() =>
    repo.createApplication(userId, {
      ...input,
      job: {
        ...input.job,
        company: 'Rollback company',
        requirementSections: [
          { rawHeading: 'Bad', type: 'INVALID' as never, content: 'test', displayOrder: 0 },
        ],
      },
    }),
  );
  assert.equal((await pool.query('SELECT count(*) FROM jobs')).rows[0].count, countBefore);
  assert.equal(
    (await pool.query("SELECT count(*) FROM companies WHERE name='Rollback company'")).rows[0]
      .count,
    '0',
  );
  const { app } = await import('../app.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server!.once('listening', r));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw Error('Missing server address');
  const root = `http://127.0.0.1:${addr.port}/api`;
  assert.equal((await fetch(root + '/applications')).status, 401);
  const registration = await fetch(root + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'api@example.com', password: 'a-secure-test-password' }),
  });
  assert.equal(registration.status, 201);
  const cookie = registration.headers.get('set-cookie')!.split(';')[0];
  const authHeaders = { 'Content-Type': 'application/json', Cookie: cookie };
  assert.equal((await fetch(root + '/applications/' + a.id, { headers: authHeaders })).status, 404);
  assert.equal(
    (await fetch(root + '/applications/not-a-uuid', { headers: authHeaders })).status,
    400,
  );
  assert.equal(
    (await fetch(root + '/applications?country=CA', { headers: authHeaders })).status,
    200,
  );
  assert.equal(
    (
      await fetch(root + '/parse', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ rawJd: 'JD', originalUrl: 'javascript:alert(1)' }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(root + '/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' },
        body: '{}',
      })
    ).status,
    403,
  );
  const saved = await fetch(root + '/applications', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(input),
  });
  assert.equal(saved.status, 201);
  const savedData = (await saved.json()) as { id: string };
  assert.equal(
    (await fetch(root + '/applications/' + savedData.id, { headers: authHeaders })).status,
    200,
  );
  assert.equal(
    (
      await fetch(root + '/applications/' + savedData.id, {
        method: 'DELETE',
        headers: authHeaders,
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(root + '/applications/' + savedData.id, { headers: authHeaders })).status,
    404,
  );
  const forgotResponse = await fetch(root + '/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'api@example.com' }),
  });
  assert.equal(forgotResponse.status, 200);
  const forgot = (await forgotResponse.json()) as {
    message: string;
    developmentResetUrl: string;
  };
  assert.match(forgot.message, /If an account uses that email/);
  const resetToken = new URL(forgot.developmentResetUrl).searchParams.get('token');
  assert.ok(resetToken);
  const resetResponse = await fetch(root + '/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, password: 'a-new-secure-test-password' }),
  });
  assert.equal(resetResponse.status, 200);
  assert.equal((await fetch(root + '/auth/session', { headers: { Cookie: cookie } })).status, 401);
  assert.equal(
    (
      await fetch(root + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'api@example.com', password: 'a-secure-test-password' }),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(root + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'api@example.com',
          password: 'a-new-secure-test-password',
        }),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(root + '/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: 'another-secure-password' }),
      })
    ).status,
    400,
  );
  const unknownForgot = await fetch(root + '/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'missing@example.com' }),
  });
  assert.equal(unknownForgot.status, 200);
  const unknownForgotBody = (await unknownForgot.json()) as {
    message: string;
    developmentResetUrl?: string;
  };
  assert.equal(unknownForgotBody.message, forgot.message);
  assert.equal(unknownForgotBody.developmentResetUrl, undefined);
  console.log(
    'PASS: PostgreSQL migrations, persistence, filters, history, auth, password recovery and REST validation.',
  );
} finally {
  if (server)
    await new Promise<void>((resolveClose, rejectClose) => {
      server!.close((error) => (error ? rejectClose(error) : resolveClose()));
      server!.closeAllConnections();
    });
  await pool.end();
  await pg.stop();
}
