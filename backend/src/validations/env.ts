import * as z from "zod";

export const gameEnvSchema = z.looseObject({
  HOUSE_EDGE: z.coerce.number(),
  MAX_MULTIPLIER: z.coerce.number(),
  MIN_MULTIPLIER: z.coerce.number(),
});

export type GameConfigT = z.infer<typeof gameEnvSchema>;
