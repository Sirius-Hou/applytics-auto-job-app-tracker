import { z } from 'zod';
import {
  arrangements,
  categories,
  sectionTypes,
  roleSummaryTags,
  skillRequirementTypes,
  skillTypes,
  terms,
} from '../../../shared/contracts.js';

const nullableText = z.string().trim().max(500).nullable();

export const aiJobParseSchema = z
  .object({
    company: nullableText,
    title: nullableText,
    category: z.enum(categories),
    term: z.enum(terms),
    recruitingYear: z.number().int().min(2000).max(2100).nullable(),
    workArrangement: z.enum(arrangements),
    roleSummary: z
      .array(z.enum(roleSummaryTags))
      .min(1)
      .max(2)
      .refine((roles) => new Set(roles).size === roles.length, 'roleSummary must be unique'),
    locations: z
      .array(
        z
          .object({
            rawText: z.string().trim().min(1).max(1000),
            city: nullableText,
            region: nullableText,
            countryCode: z
              .string()
              .regex(/^[A-Z]{2}$/)
              .nullable(),
          })
          .strict(),
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
        rawText: z.string().trim().min(1).max(4000),
      })
      .strict()
      .refine(
        (value) =>
          value.minimum === null || value.maximum === null || value.minimum <= value.maximum,
        'Compensation minimum must not exceed maximum',
      )
      .nullable(),
    requirementSections: z
      .array(
        z
          .object({
            rawHeading: z.string().trim().max(500),
            type: z.enum(sectionTypes),
            content: z.string().trim().min(1).max(200000),
            displayOrder: z.number().int().nonnegative(),
          })
          .strict(),
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
  })
  .strict()
  .superRefine((value, context) => {
    value.requirementSections.forEach((section, index) => {
      if (section.displayOrder !== index) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requirementSections', index, 'displayOrder'],
          message: 'displayOrder must be zero-based and consecutive',
        });
      }
    });
    const seenSkills = new Set<string>();
    value.skills.forEach((skill, index) => {
      const normalized = skill.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
      if (seenSkills.has(normalized)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skills', index, 'name'],
          message: 'skills must be a deduplicated set',
        });
      }
      seenSkills.add(normalized);
    });
  });

export type AiJobParse = z.infer<typeof aiJobParseSchema>;

const nullableString = { type: ['string', 'null'] } as const;
const nullableNumber = { type: ['number', 'null'], minimum: 0, maximum: 1e12 } as const;

export const aiJobParseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    company: nullableString,
    title: nullableString,
    category: { type: 'string', enum: categories },
    term: { type: 'string', enum: terms },
    recruitingYear: { type: ['integer', 'null'], minimum: 2000, maximum: 2100 },
    workArrangement: { type: 'string', enum: arrangements },
    roleSummary: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: { type: 'string', enum: roleSummaryTags },
    },
    locations: {
      type: 'array',
      maxItems: 100,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          rawText: { type: 'string' },
          city: nullableString,
          region: nullableString,
          countryCode: { type: ['string', 'null'], pattern: '^[A-Z]{2}$' },
        },
        required: ['rawText', 'city', 'region', 'countryCode'],
      },
    },
    compensation: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            currency: { type: ['string', 'null'], pattern: '^[A-Z]{3}$' },
            minimum: nullableNumber,
            maximum: nullableNumber,
            payPeriod: {
              type: 'string',
              enum: ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'UNKNOWN'],
            },
            rawText: { type: 'string' },
          },
          required: ['currency', 'minimum', 'maximum', 'payPeriod', 'rawText'],
        },
        { type: 'null' },
      ],
    },
    requirementSections: {
      type: 'array',
      maxItems: 100,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          rawHeading: { type: 'string' },
          type: { type: 'string', enum: sectionTypes },
          content: { type: 'string' },
          displayOrder: { type: 'integer', minimum: 0 },
        },
        required: ['rawHeading', 'type', 'content', 'displayOrder'],
      },
    },
    keyRequirements: {
      type: 'object',
      description:
        'Verbatim concrete requirements selected from the corresponding source sections. A list cannot be empty when its source section contains concrete role-defining requirements.',
      additionalProperties: false,
      properties: {
        minimum: {
          type: 'array',
          description:
            'Concrete minimum requirements copied verbatim, excluding generic boilerplate.',
          maxItems: 100,
          items: { type: 'string' },
        },
        preferred: {
          type: 'array',
          description:
            'Concrete preferred requirements copied verbatim, excluding generic boilerplate.',
          maxItems: 100,
          items: { type: 'string' },
        },
      },
      required: ['minimum', 'preferred'],
    },
    skills: {
      type: 'array',
      description:
        'Deduplicated searchable technical skills using the project twelve-type taxonomy and explicitly supported by the JD.',
      maxItems: 200,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: skillTypes },
          requirementType: { type: 'string', enum: skillRequirementTypes },
        },
        required: ['name', 'type', 'requirementType'],
      },
    },
    experience: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            minimumYears: { type: ['number', 'null'], minimum: 0, maximum: 100 },
            maximumYears: { type: ['number', 'null'], minimum: 0, maximum: 100 },
            rawText: { type: 'string' },
          },
          required: ['minimumYears', 'maximumYears', 'rawText'],
        },
        { type: 'null' },
      ],
    },
  },
  required: [
    'company',
    'title',
    'category',
    'term',
    'recruitingYear',
    'workArrangement',
    'roleSummary',
    'locations',
    'compensation',
    'requirementSections',
    'keyRequirements',
    'skills',
    'experience',
  ],
} as const;
