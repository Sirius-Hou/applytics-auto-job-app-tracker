import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const configSchema = z.object({
  OPENAI_API_KEY: z.string().min(20),
  OPENAI_MODEL: z.string().min(1),
  OPENAI_REASONING_EFFORT: z.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']).default('low'),
  OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(128000).default(6000),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(60000),
});

export type OpenAiConfig = z.infer<typeof configSchema>;

export function loadOpenAiConfig(path = resolve('.env.openai')): OpenAiConfig {
  const fileConfig = existsSync(path) ? dotenv.parse(readFileSync(path)) : {};
  return configSchema.parse({ ...fileConfig, ...process.env });
}
