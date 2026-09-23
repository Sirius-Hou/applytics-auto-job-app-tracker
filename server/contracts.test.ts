import { describe, expect, it } from 'vitest';
import { createSchema, filterSchema, jobSchema } from '../shared/contracts.js';
import { normalizeCompany } from './normalizers.js';
import { buildFilters } from './repositories/applications.js';

const job = {
  rawJd: 'Example job description',
  originalUrl: 'https://example.com/jobs/123',
  canonicalUrl: null,
  company: 'Example Labs',
  title: 'Software Engineer',
  category: 'FULL_TIME',
  term: 'UNKNOWN',
  recruitingYear: null,
  workArrangement: 'ONSITE',
  locations: [],
  compensation: null,
  requirementSections: [],
  keyRequirements: { minimum: [], preferred: [] },
  skills: [],
  roleSummary: ['GENERAL_SWE'],
  experience: null,
  parserModel: null,
  parserVersion: null,
} as const;

describe('contracts and query construction', () => {
  it('rejects unsafe URLs and reversed compensation ranges', () => {
    expect(jobSchema.safeParse({ ...job, originalUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(
      jobSchema.safeParse({
        ...job,
        compensation: {
          currency: 'USD',
          minimum: 5,
          maximum: 1,
          payPeriod: 'HOUR',
          rawText: '$5-$1',
        },
      }).success,
    ).toBe(false);
  });

  it('applies safe application defaults', () => {
    const application = createSchema.parse({ job });
    expect(application.status).toBe('APPLIED');
    expect(Date.now() - new Date(application.appliedAt).getTime()).toBeLessThan(1000);
  });

  it('validates date bounds and paging', () => {
    expect(filterSchema.safeParse({ from: '2026-09-22', to: '2026-01-01' }).success).toBe(false);
    expect(filterSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('uses owner-scoped parameters and EXISTS filters', () => {
    const userId = '00000000-0000-0000-0000-000000000001';
    const query = buildFilters(
      userId,
      filterSchema.parse({ company: "x' OR true--", country: 'CA' }),
    );
    expect(query.where).not.toContain("x' OR");
    expect(query.values).toEqual([userId, "x' OR true--", ['CA']]);
    expect(query.where).toContain('a.user_id=$1');
    expect(query.where).toContain('EXISTS');
  });

  it('normalizes company whitespace and case', () => {
    expect(normalizeCompany('  ACME   Labs ')).toBe('acme labs');
  });
});
