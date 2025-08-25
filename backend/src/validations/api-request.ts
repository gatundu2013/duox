import { ValidationError } from "../utils";
import * as z from "zod";

export function validateApiRequest<T, K>(schema: z.ZodType<T>, payload: K): T {
  const { error, success, data } = schema.safeParse(payload);

  if (!success) {
    throw new ValidationError({
      httpCode: 400,
      isOperational: true,
      message: error.issues[0].message,
    });
  }

  return data;
}
