import { z } from 'zod';
export const categories = [
  'INTERNSHIP',
  'FULL_TIME',
  'NEW_GRAD',
  'COOP',
  'PART_TIME',
  'CONTRACT',
  'TEMPORARY',
  'UNKNOWN',
] as const;
export const terms = ['SUMMER', 'FALL', 'WINTER', 'SPRING', 'UNKNOWN'] as const;
export const arrangements = ['ONSITE', 'HYBRID', 'REMOTE', 'UNKNOWN'] as const;
export const statuses = [
  'SAVED',
  'APPLIED',
  'OA',
  'RECRUITER_SCREEN',
  'PHONE_SCREEN',
  'TECHNICAL_INTERVIEW',
  'ONSITE_INTERVIEW',
  'FINAL_INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
  'GHOSTED',
] as const;
export const sectionTypes = ['MINIMUM', 'PREFERRED', 'OTHER', 'UNKNOWN'] as const;
export const skillTypes = [
  'PROGRAMMING_LANGUAGE',
  'FRAMEWORK',
  'LIBRARY',
  'TOOL',
  'PLATFORM',
  'DATABASE',
  'CLOUD',
  'OPERATING_SYSTEM',
  'PROTOCOL_API',
  'HARDWARE',
  'TECHNICAL_DOMAIN',
  'ENGINEERING_PRACTICE',
] as const;
export const roleSummaryTags = [
  'GENERAL_SWE',
  'FRONTEND',
  'BACKEND',
  'FULL_STACK',
  'MOBILE',
  'DESKTOP',
  'EMBEDDED',
  'FIRMWARE',
  'SYSTEMS',
  'INFRASTRUCTURE',
  'PLATFORM',
  'CLOUD',
  'DEVOPS',
  'SRE',
  'DATA_ENGINEERING',
  'DATA_SCIENCE',
  'MACHINE_LEARNING',
  'AI_AGENT',
  'AI_INFRASTRUCTURE',
  'MLOPS',
  'GRAPHICS',
  'GAMING',
  'ROBOTICS',
  'SECURITY',
  'NETWORKING',
  'DATABASE',
  'COMPILERS',
  'DEVELOPER_TOOLS',
  'QA_TESTING',
  'AUTOMATION',
] as const;
export const skillRequirementTypes = ['MINIMUM', 'PREFERRED', 'OTHER'] as const;
const nullableText = z.string().trim().max(500).nullable();
const url = z
  .string()
  .url()
  .max(4000)
  .refine((v) => ['https:', 'http:'].includes(new URL(v).protocol), 'Use an HTTP or HTTPS URL');
export const parseInput = z.object({ rawJd: z.string().min(1).max(200000), originalUrl: url });
export const jobSchema = parseInput.extend({
  company: nullableText,
  title: nullableText,
  category: z.enum(categories),
  term: z.enum(terms),
  recruitingYear: z.number().int().min(2000).max(2100).nullable(),
  workArrangement: z.enum(arrangements),
  canonicalUrl: url.nullable(),
  roleSummary: z.array(z.enum(roleSummaryTags)).min(1).max(2),
  locations: z
    .array(
      z.object({
        rawText: z.string().min(1).max(1000),
        city: nullableText,
        region: nullableText,
        countryCode: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .nullable(),
      }),
    )
    .max(100),
  compensation: z
    .object({
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .nullable(),
      minimum: z.number().nonnegative().max(1e12).nullable(),
      maximum: z.number().nonnegative().max(1e12).nullable(),
      payPeriod: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'UNKNOWN']),
      rawText: z.string().max(4000),
    })
    .refine(
      (v) => v.minimum === null || v.maximum === null || v.minimum <= v.maximum,
      'Minimum must not exceed maximum',
    )
    .nullable(),
  requirementSections: z
    .array(
      z.object({
        rawHeading: z.string().max(500),
        type: z.enum(sectionTypes),
        content: z.string().max(200000),
        displayOrder: z.number().int().nonnegative(),
      }),
    )
    .max(100),
  keyRequirements: z
    .object({
      minimum: z.array(z.string().trim().min(1).max(4000)).max(100),
      preferred: z.array(z.string().trim().min(1).max(4000)).max(100),
    })
    .strict(),
  skills: z
    .array(
      z
        .object({
          name: z.string().trim().min(1).max(200),
          type: z.enum(skillTypes),
          requirementType: z.enum(skillRequirementTypes),
        })
        .strict(),
    )
    .max(200),
  experience: z
    .object({
      minimumYears: z.number().nonnegative().max(100).nullable(),
      maximumYears: z.number().nonnegative().max(100).nullable(),
      rawText: z.string().trim().min(1).max(2000),
    })
    .strict()
    .refine(
      (value) =>
        value.minimumYears === null ||
        value.maximumYears === null ||
        value.minimumYears <= value.maximumYears,
      'Experience minimum must not exceed maximum',
    )
    .nullable(),
  parserModel: nullableText,
  parserVersion: nullableText,
});
export const createSchema = z.object({
  job: jobSchema,
  status: z.enum(statuses).default('APPLIED'),
  appliedAt: z
    .string()
    .datetime({ offset: true })
    .default(() => new Date().toISOString()),
  notes: z.string().max(50000).default(''),
});
export const updateSchema = z
  .object({
    appliedAt: z.string().datetime({ offset: true }).optional(),
    notes: z.string().max(50000).optional(),
  })
  .strict();
export const eventSchema = z.object({
  type: z.enum(statuses),
  occurredAt: z
    .string()
    .datetime({ offset: true })
    .default(() => new Date().toISOString()),
  notes: z.string().max(50000).default(''),
});
const commaList = (item: z.ZodTypeAny) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : value,
    z.array(item).min(1).max(50),
  );
export const filterSchema = z
  .object({
    q: z.string().max(500).optional(),
    title: z.string().trim().max(500).optional(),
    company: z.string().max(500).optional(),
    country: commaList(z.string().regex(/^[A-Z]{2}$/)).optional(),
    status: commaList(z.enum(statuses)).optional(),
    category: commaList(z.enum(categories)).optional(),
    term: commaList(z.enum(terms)).optional(),
    workArrangement: commaList(z.enum(arrangements)).optional(),
    skill: z.string().trim().max(200).optional(),
    role: z.enum(roleSummaryTags).optional(),
    appliedWithin: z.enum(['1d', '1w', '1m', '2m', '3m', '6m', '1y', '2y']).optional(),
    location: z.string().trim().max(500).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    sort: z
      .enum(['recently_updated', 'newest_applied', 'oldest_applied', 'company_az', 'status'])
      .default('recently_updated'),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    interviews: z.enum(['true']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, 'From date must precede to date');
export const analyticsFilterSchema = z
  .object({
    period: z.enum(['30d', '3m', '6m', '1y', 'all']).default('30d'),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    company: z.string().trim().max(500).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'From date must precede to date',
  });
export type Job = z.infer<typeof jobSchema>;
export type CreateApplication = z.infer<typeof createSchema>;
export type Filters = z.infer<typeof filterSchema>;
export type AnalyticsFilters = z.infer<typeof analyticsFilterSchema>;
export type ApplicationEvent = {
  id: string;
  type: (typeof statuses)[number];
  occurredAt: string;
  notes: string;
};
export type Application = {
  id: string;
  job: Job;
  status: (typeof statuses)[number];
  appliedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  events: ApplicationEvent[];
};
