import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  HOST_SECRET: z.string().min(4).default('quizx-host-2026'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional().or(z.literal(''))
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = {
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  clientUrl: parsed.data.CLIENT_URL,
  hostSecret: parsed.data.HOST_SECRET,
  supabaseUrl: parsed.data.SUPABASE_URL || undefined,
  supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY || undefined,
  hasSupabase: Boolean(parsed.data.SUPABASE_URL && parsed.data.SUPABASE_SERVICE_ROLE_KEY)
};
