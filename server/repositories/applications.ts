import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { pool, transaction } from '../db/pool.js';
import { normalizeCompany, normalizeSkill } from '../normalizers.js';
import type {
  AnalyticsFilters,
  Application,
  CreateApplication,
  Filters,
} from '../../shared/contracts.js';
type Db = Pick<pg.PoolClient, 'query'>;
export async function getApplication(
  userId: string,
  id: string,
  db: Db = pool,
): Promise<Application | null> {
  const {
    rows: [r],
  } = await db.query(
    `SELECT a.*,j.title,j.category,j.term,j.recruiting_year,j.work_arrangement,j.original_url,j.canonical_url,j.raw_jd,j.compensation_currency,j.compensation_minimum,j.compensation_maximum,j.compensation_period,j.compensation_text,j.experience_min_years,j.experience_max_years,j.experience_text,j.parser_model,j.parser_version,c.name AS company FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN companies c ON c.id=j.company_id WHERE a.id=$1 AND a.user_id=$2`,
    [id, userId],
  );
  if (!r) return null;
  const locations = (
    await db.query(
      'SELECT raw_text AS "rawText",city,region,country_code AS "countryCode" FROM job_locations WHERE job_id=$1 ORDER BY display_order',
      [r.job_id],
    )
  ).rows;
  const requirementSections = (
    await db.query(
      'SELECT raw_heading AS "rawHeading",type,content,display_order AS "displayOrder" FROM requirement_sections WHERE job_id=$1 ORDER BY display_order,id',
      [r.job_id],
    )
  ).rows;
  const keyRequirementRows = (
    await db.query(
      'SELECT requirement_type AS type,content FROM key_requirements WHERE job_id=$1 ORDER BY requirement_type,display_order,id',
      [r.job_id],
    )
  ).rows;
  const skills = (
    await db.query(
      'SELECT s.canonical_name AS name,s.skill_type AS type,js.requirement_type AS "requirementType" FROM job_skills js JOIN skills s ON s.id=js.skill_id WHERE js.job_id=$1 ORDER BY js.display_order,s.canonical_name',
      [r.job_id],
    )
  ).rows;
  const roleSummary = (
    await db.query('SELECT role_tag FROM job_role_tags WHERE job_id=$1 ORDER BY display_order', [
      r.job_id,
    ])
  ).rows.map((item) => item.role_tag);
  const events = (
    await db.query(
      'SELECT id,event_type AS type,occurred_at AS "occurredAt",notes FROM application_events WHERE application_id=$1 ORDER BY occurred_at DESC,sequence DESC',
      [id],
    )
  ).rows.map((e) => ({ ...e, occurredAt: e.occurredAt.toISOString() }));
  return {
    id: r.id,
    status: r.current_status,
    appliedAt: r.applied_at.toISOString(),
    notes: r.notes,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    events,
    job: {
      company: r.company,
      title: r.title,
      category: r.category,
      term: r.term,
      recruitingYear: r.recruiting_year,
      workArrangement: r.work_arrangement,
      roleSummary,
      originalUrl: r.original_url,
      canonicalUrl: r.canonical_url,
      rawJd: r.raw_jd,
      locations,
      requirementSections,
      keyRequirements: {
        minimum: keyRequirementRows
          .filter((item) => item.type === 'MINIMUM')
          .map((item) => item.content),
        preferred: keyRequirementRows
          .filter((item) => item.type === 'PREFERRED')
          .map((item) => item.content),
      },
      skills,
      experience:
        r.experience_text === null
          ? null
          : {
              minimumYears: r.experience_min_years === null ? null : Number(r.experience_min_years),
              maximumYears: r.experience_max_years === null ? null : Number(r.experience_max_years),
              rawText: r.experience_text,
            },
      parserModel: r.parser_model,
      parserVersion: r.parser_version,
      compensation:
        r.compensation_text === null
          ? null
          : {
              currency: r.compensation_currency,
              minimum: r.compensation_minimum === null ? null : Number(r.compensation_minimum),
              maximum: r.compensation_maximum === null ? null : Number(r.compensation_maximum),
              payPeriod: r.compensation_period,
              rawText: r.compensation_text,
            },
    },
  };
}
export async function createApplication(userId: string, input: CreateApplication) {
  return transaction(async (c) => {
    const j = input.job;
    let companyId: string | null = null;
    if (j.company?.trim()) {
      const result = await c.query(
        'INSERT INTO companies(id,name,normalized_name) VALUES($1,$2,$3) ON CONFLICT(normalized_name) DO UPDATE SET normalized_name=EXCLUDED.normalized_name RETURNING id',
        [randomUUID(), j.company.trim(), normalizeCompany(j.company)],
      );
      companyId = result.rows[0].id;
    }
    const jobId = randomUUID(),
      id = randomUUID();
    await c.query(
      'INSERT INTO jobs(id,company_id,title,category,term,recruiting_year,work_arrangement,original_url,canonical_url,raw_jd,compensation_currency,compensation_minimum,compensation_maximum,compensation_period,compensation_text,experience_min_years,experience_max_years,experience_text,parser_model,parser_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)',
      [
        jobId,
        companyId,
        j.title,
        j.category,
        j.term,
        j.recruitingYear,
        j.workArrangement,
        j.originalUrl,
        j.canonicalUrl,
        j.rawJd,
        j.compensation?.currency ?? null,
        j.compensation?.minimum ?? null,
        j.compensation?.maximum ?? null,
        j.compensation?.payPeriod ?? null,
        j.compensation?.rawText ?? null,
        j.experience?.minimumYears ?? null,
        j.experience?.maximumYears ?? null,
        j.experience?.rawText ?? null,
        j.parserModel,
        j.parserVersion,
      ],
    );
    for (const [i, l] of j.locations.entries())
      await c.query(
        'INSERT INTO job_locations(id,job_id,raw_text,city,region,country_code,display_order) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(), jobId, l.rawText, l.city, l.region, l.countryCode, i],
      );
    for (const s of j.requirementSections)
      await c.query(
        'INSERT INTO requirement_sections(id,job_id,raw_heading,type,content,display_order) VALUES($1,$2,$3,$4,$5,$6)',
        [randomUUID(), jobId, s.rawHeading, s.type, s.content, s.displayOrder],
      );
    for (const [requirementType, items] of [
      ['MINIMUM', j.keyRequirements.minimum],
      ['PREFERRED', j.keyRequirements.preferred],
    ] as const)
      for (const [displayOrder, content] of items.entries())
        await c.query(
          'INSERT INTO key_requirements(id,job_id,requirement_type,content,display_order) VALUES($1,$2,$3,$4,$5)',
          [randomUUID(), jobId, requirementType, content, displayOrder],
        );
    const seenSkills = new Set<string>();
    for (const [displayOrder, skill] of j.skills.entries()) {
      const normalizedName = normalizeSkill(skill.name);
      if (seenSkills.has(normalizedName)) continue;
      seenSkills.add(normalizedName);
      const skillResult = await c.query(
        'INSERT INTO skills(id,canonical_name,normalized_name,skill_type) VALUES($1,$2,$3,$4) ON CONFLICT(normalized_name) DO UPDATE SET canonical_name=EXCLUDED.canonical_name,skill_type=EXCLUDED.skill_type RETURNING id',
        [randomUUID(), skill.name, normalizedName, skill.type],
      );
      await c.query(
        'INSERT INTO job_skills(job_id,skill_id,requirement_type,display_order) VALUES($1,$2,$3,$4)',
        [jobId, skillResult.rows[0].id, skill.requirementType, displayOrder],
      );
    }
    for (const [displayOrder, roleTag] of j.roleSummary.entries())
      await c.query('INSERT INTO job_role_tags(job_id,role_tag,display_order) VALUES($1,$2,$3)', [
        jobId,
        roleTag,
        displayOrder,
      ]);
    await c.query(
      'INSERT INTO applications(id,job_id,current_status,applied_at,notes,user_id) VALUES($1,$2,$3,$4,$5,$6)',
      [id, jobId, input.status, input.appliedAt, input.notes, userId],
    );
    await c.query(
      'INSERT INTO application_events(id,application_id,event_type,occurred_at,notes) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), id, input.status, input.appliedAt, ''],
    );
    return (await getApplication(userId, id, c))!;
  });
}
export function buildFilters(userId: string, f: Filters) {
  const values: unknown[] = [userId];
  const conditions: string[] = ['a.user_id=$1'];
  const add = (sql: string, v: unknown) => {
    values.push(v);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (f.q) {
    values.push(f.q);
    const p = `$${values.length}`;
    conditions.push(
      `(to_tsvector('english',coalesce(j.title,'') || ' ' || j.raw_jd) @@ plainto_tsquery('english',${p}) OR strpos(lower(coalesce(c.name,'')),lower(${p}))>0 OR EXISTS(SELECT 1 FROM job_skills jqs JOIN skills qs ON qs.id=jqs.skill_id WHERE jqs.job_id=j.id AND strpos(qs.normalized_name,lower(${p}))>0) OR EXISTS(SELECT 1 FROM key_requirements qk WHERE qk.job_id=j.id AND strpos(lower(qk.content),lower(${p}))>0))`,
    );
  }
  if (f.title) add("strpos(lower(coalesce(j.title,'')),lower(?))>0", f.title);
  if (f.company) add("strpos(lower(coalesce(c.name,'')),lower(?))>0", f.company);
  if (f.country)
    add(
      'EXISTS(SELECT 1 FROM job_locations l WHERE l.job_id=j.id AND l.country_code=ANY(?::text[]))',
      f.country,
    );
  if (f.location)
    add(
      "EXISTS(SELECT 1 FROM job_locations l WHERE l.job_id=j.id AND strpos(lower(concat_ws(' ',l.raw_text,l.city,l.region,l.country_code)),lower(?))>0)",
      f.location,
    );
  if (f.skill)
    add(
      'EXISTS(SELECT 1 FROM job_skills jsf JOIN skills sf ON sf.id=jsf.skill_id WHERE jsf.job_id=j.id AND sf.normalized_name=lower(?))',
      normalizeSkill(f.skill),
    );
  if (f.role)
    add('EXISTS(SELECT 1 FROM job_role_tags jrt WHERE jrt.job_id=j.id AND jrt.role_tag=?)', f.role);
  for (const [key, col] of [
    ['status', 'a.current_status'],
    ['category', 'j.category'],
    ['term', 'j.term'],
    ['workArrangement', 'j.work_arrangement'],
  ] as const)
    if (f[key]) add(`${col}=ANY(?::text[])`, f[key]);
  if (f.from) add('a.applied_at >= ?::date', f.from);
  if (f.to) add("a.applied_at < (?::date + interval '1 day')", f.to);
  if (f.appliedWithin) {
    const intervals = {
      '1d': '1 day',
      '1w': '1 week',
      '1m': '1 month',
      '2m': '2 months',
      '3m': '3 months',
      '6m': '6 months',
      '1y': '1 year',
      '2y': '2 years',
    } as const;
    add('a.applied_at >= now() - ?::interval', intervals[f.appliedWithin]);
  }
  if (f.year) add('extract(year from a.applied_at)=?', f.year);
  if (f.interviews)
    conditions.push(
      "a.current_status IN ('RECRUITER_SCREEN','PHONE_SCREEN','TECHNICAL_INTERVIEW','ONSITE_INTERVIEW','FINAL_INTERVIEW')",
    );
  return { where: conditions.length ? ' WHERE ' + conditions.join(' AND ') : '', values };
}

export async function listSkillStats(userId: string, limit = 100) {
  const { rows } = await pool.query(
    `SELECT s.canonical_name AS name,s.skill_type AS type,
      count(DISTINCT a.id)::int AS "applicationCount",
      count(DISTINCT a.id) FILTER (WHERE js.requirement_type='MINIMUM')::int AS "minimumCount",
      count(DISTINCT a.id) FILTER (WHERE js.requirement_type='PREFERRED')::int AS "preferredCount",
      count(DISTINCT a.id) FILTER (WHERE js.requirement_type='OTHER')::int AS "otherCount"
     FROM skills s
     JOIN job_skills js ON js.skill_id=s.id
     JOIN jobs j ON j.id=js.job_id
     JOIN applications a ON a.job_id=j.id
     WHERE a.user_id=$1
     GROUP BY s.id,s.canonical_name,s.skill_type
     ORDER BY "applicationCount" DESC,s.canonical_name
     LIMIT $2`,
    [userId, limit],
  );
  return rows;
}

export async function listRoleStats(userId: string) {
  const { rows } = await pool.query(
    `SELECT jrt.role_tag AS role,count(DISTINCT a.id)::int AS "applicationCount"
     FROM job_role_tags jrt
     JOIN applications a ON a.job_id=jrt.job_id
     WHERE a.user_id=$1
     GROUP BY jrt.role_tag
     ORDER BY "applicationCount" DESC,jrt.role_tag`,
    [userId],
  );
  return rows;
}

function analyticsDateRange(filters: AnalyticsFilters) {
  if (filters.from || filters.to) return { from: filters.from ?? null, to: filters.to ?? null };
  if (filters.period === 'all') return { from: null, to: null };
  const now = new Date();
  const from = new Date(now);
  if (filters.period === '30d') from.setUTCDate(from.getUTCDate() - 30);
  if (filters.period === '3m') from.setUTCMonth(from.getUTCMonth() - 3);
  if (filters.period === '6m') from.setUTCMonth(from.getUTCMonth() - 6);
  if (filters.period === '1y') from.setUTCFullYear(from.getUTCFullYear() - 1);
  return { from: from.toISOString(), to: null };
}

export async function getApplicationOverview(userId: string, filters: AnalyticsFilters) {
  const range = analyticsDateRange(filters);
  const values: unknown[] = [userId];
  const conditions: string[] = ['a.user_id=$1', "a.current_status <> 'SAVED'"];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (range.from) add('a.applied_at >= ?::timestamptz', range.from);
  if (range.to) add("a.applied_at < (?::date + interval '1 day')", range.to);
  if (filters.company) add("strpos(lower(coalesce(c.name,'')),lower(?))>0", filters.company);
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const base =
    ' FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN companies c ON c.id=j.company_id';
  return transaction(async (client) => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const totalApplications = Number(
      (await client.query(`SELECT count(DISTINCT a.id) AS count${base}${where}`, values)).rows[0]
        .count,
    );
    const countries = (
      await client.query(
        `SELECT l.country_code AS "countryCode",count(DISTINCT a.id)::int AS count${base} JOIN job_locations l ON l.job_id=j.id${where}${where ? ' AND' : ' WHERE'} l.country_code IS NOT NULL GROUP BY l.country_code ORDER BY count DESC,l.country_code`,
        values,
      )
    ).rows;
    const companies = (
      await client.query(
        `SELECT c.name,count(DISTINCT a.id)::int AS count${base}${where}${where ? ' AND' : ' WHERE'} c.id IS NOT NULL GROUP BY c.id,c.name ORDER BY count DESC,c.name`,
        values,
      )
    ).rows;
    const months = (
      await client.query(
        `SELECT to_char(date_trunc('month',a.applied_at),'YYYY-MM') AS month,count(DISTINCT a.id)::int AS count${base}${where} GROUP BY date_trunc('month',a.applied_at) ORDER BY date_trunc('month',a.applied_at)`,
        values,
      )
    ).rows;
    const roles = (
      await client.query(
        `SELECT jrt.role_tag AS role,count(DISTINCT a.id)::int AS count${base} JOIN job_role_tags jrt ON jrt.job_id=j.id${where} GROUP BY jrt.role_tag ORDER BY count DESC,jrt.role_tag`,
        values,
      )
    ).rows;
    return {
      period: filters.period,
      from: range.from,
      to: range.to,
      company: filters.company ?? null,
      totalApplications,
      countries,
      companies,
      months,
      roles,
    };
  });
}
export async function listApplications(userId: string, f: Filters) {
  const { where, values } = buildFilters(userId, f);
  const join =
    ' FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN companies c ON c.id=j.company_id';
  return transaction(async (c) => {
    await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const total = Number((await c.query('SELECT count(*) AS n' + join + where, values)).rows[0].n);
    const orderBy = {
      recently_updated: 'a.updated_at DESC,a.id',
      newest_applied: 'a.applied_at DESC,a.id',
      oldest_applied: 'a.applied_at ASC,a.id',
      company_az: 'c.name ASC NULLS LAST,a.applied_at DESC,a.id',
      status: 'a.current_status ASC,a.updated_at DESC,a.id',
    }[f.sort];
    const { rows } = await c.query(
      `SELECT a.id,a.current_status AS status,a.applied_at AS "appliedAt",a.updated_at AS "updatedAt",c.name AS company,j.title,j.category,j.term,j.work_arrangement AS "workArrangement",
       (SELECT l.country_code FROM job_locations l WHERE l.job_id=j.id ORDER BY l.display_order LIMIT 1) AS "countryCode"` +
        join +
        where +
        ` ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, f.limit, (f.page - 1) * f.limit],
    );
    return { items: rows, total, page: f.page, limit: f.limit };
  });
}
export async function deleteApplication(userId: string, id: string) {
  return transaction(async (c) => {
    const result = await c.query(
      'DELETE FROM applications WHERE id=$1 AND user_id=$2 RETURNING job_id',
      [id, userId],
    );
    if (!result.rowCount) return false;
    const jobId = result.rows[0].job_id;
    const job = await c.query(
      'DELETE FROM jobs WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM applications WHERE job_id=$1) RETURNING company_id',
      [jobId],
    );
    const companyId = job.rows[0]?.company_id;
    if (companyId)
      await c.query(
        'DELETE FROM companies WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM jobs WHERE company_id=$1)',
        [companyId],
      );
    return true;
  });
}
export async function updateApplication(
  userId: string,
  id: string,
  input: { notes?: string; appliedAt?: string },
) {
  return transaction(async (c) => {
    const r = await c.query(
      'UPDATE applications SET notes=coalesce($3,notes),applied_at=coalesce($4::timestamptz,applied_at),updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, userId, input.notes ?? null, input.appliedAt ?? null],
    );
    return r.rowCount ? getApplication(userId, id, c) : null;
  });
}
export async function addEvent(
  userId: string,
  id: string,
  event: { type: string; occurredAt: string; notes: string },
) {
  return transaction(async (c) => {
    if (
      !(
        await c.query('SELECT id FROM applications WHERE id=$1 AND user_id=$2 FOR UPDATE', [
          id,
          userId,
        ])
      ).rowCount
    )
      return null;
    await c.query(
      'INSERT INTO application_events(id,application_id,event_type,occurred_at,notes) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), id, event.type, event.occurredAt, event.notes],
    );
    await c.query(
      'UPDATE applications SET current_status=(SELECT event_type FROM application_events WHERE application_id=$1 ORDER BY occurred_at DESC,sequence DESC LIMIT 1),updated_at=now() WHERE id=$1',
      [id],
    );
    return getApplication(userId, id, c);
  });
}

async function refreshCurrentStatus(applicationId: string, db: Db) {
  await db.query(
    `UPDATE applications SET current_status=coalesce(
      (SELECT event_type FROM application_events WHERE application_id=$1 ORDER BY occurred_at DESC,sequence DESC LIMIT 1),
      'SAVED'
    ),updated_at=now() WHERE id=$1`,
    [applicationId],
  );
}

export async function updateEvent(
  userId: string,
  applicationId: string,
  eventId: string,
  event: { type: string; occurredAt: string; notes: string },
) {
  return transaction(async (c) => {
    if (
      !(
        await c.query('SELECT id FROM applications WHERE id=$1 AND user_id=$2 FOR UPDATE', [
          applicationId,
          userId,
        ])
      ).rowCount
    )
      return null;
    const result = await c.query(
      'UPDATE application_events SET event_type=$3,occurred_at=$4,notes=$5 WHERE id=$2 AND application_id=$1 RETURNING id',
      [applicationId, eventId, event.type, event.occurredAt, event.notes],
    );
    if (!result.rowCount) return null;
    await refreshCurrentStatus(applicationId, c);
    return getApplication(userId, applicationId, c);
  });
}

export async function deleteEvent(userId: string, applicationId: string, eventId: string) {
  return transaction(async (c) => {
    if (
      !(
        await c.query('SELECT id FROM applications WHERE id=$1 AND user_id=$2 FOR UPDATE', [
          applicationId,
          userId,
        ])
      ).rowCount
    )
      return null;
    const result = await c.query(
      'DELETE FROM application_events WHERE id=$2 AND application_id=$1 RETURNING id',
      [applicationId, eventId],
    );
    if (!result.rowCount) return null;
    await refreshCurrentStatus(applicationId, c);
    return getApplication(userId, applicationId, c);
  });
}
