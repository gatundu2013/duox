import * as z from "zod";
import { ICONS } from "../utils/icons";

export const envSchema = {
  gameEnvSchema: z.looseObject({
    HOUSE_EDGE: z.coerce.number(),
    MAX_MULTIPLIER: z.coerce.number(),
    MIN_MULTIPLIER: z.coerce.number(),
  }),

  dbEnvSchema: z.looseObject({
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
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
