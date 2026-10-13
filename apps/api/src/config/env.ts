import { z } from 'zod';
import 'dotenv/config';

/**
 * Validates all required environment variables at startup.
 * Missing required vars will throw — fail fast before any routes are registered.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DB_PATH: z.string().default('./data/catalogpilot.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // AI — optional; absence activates demo mode
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  // WooCommerce — optional; absence activates demo integration
  WC_SITE_URL: z.string().url().optional().or(z.literal('')),
  WC_CONSUMER_KEY: z.string().optional(),
  WC_CONSUMER_SECRET: z.string().optional(),
  WC_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  WC_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),

  // Feature flags
  DEMO_MODE: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

export const isAiEnabled = (): boolean =>
  !!config.GOOGLE_API_KEY && config.GOOGLE_API_KEY.length > 10;

export const isWcEnabled = (): boolean =>
  !!config.WC_SITE_URL &&
  !!config.WC_CONSUMER_KEY &&
  !!config.WC_CONSUMER_SECRET &&
  config.WC_SITE_URL.length > 0;

export const isDemoMode = (): boolean => config.DEMO_MODE || !isAiEnabled();
