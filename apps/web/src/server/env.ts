import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "production") {
  config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    quiet: true,
  });
}

export const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

const uncomputedEnv = EnvSchema.parse(process.env);
export const env = {
  ...uncomputedEnv,
  DATABASE_URL: `postgresql://${uncomputedEnv.POSTGRES_USER}:${uncomputedEnv.POSTGRES_PASSWORD}@${uncomputedEnv.POSTGRES_HOST}:${uncomputedEnv.POSTGRES_PORT}/${uncomputedEnv.POSTGRES_DB}`,
};
