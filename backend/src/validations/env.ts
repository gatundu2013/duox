import * as z from "zod";
import { ICONS } from "../utils/icons";

export const envSchema = {
  serverEnvSchema: z.object({
    PORT: z.coerce.number(),
  }),

  gameEnvSchema: z.object({
    HOUSE_EDGE: z.coerce.number(),
    MAX_MULTIPLIER: z.coerce.number(),
    MIN_MULTIPLIER: z.coerce.number(),
  }),

  dbEnvSchema: z.object({
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
  }),

  jwtEnvSchema: z.object({
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
  }),
};

export function parseEnv<T>(schema: z.ZodSchema<T>): T {
  const { error, success, data } = schema.safeParse(process.env);

  if (!success) {
    console.error(`${ICONS.FAILURE} LoadEnvError: ${error.issues[0].message}`);
    process.exit(1);
  }

  return data;
}
