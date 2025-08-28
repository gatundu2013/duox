import { ApiError } from "../errors/base-errors";

export function handleApiError(err: unknown, fallBackMessage: string) {
  let errMsg = fallBackMessage;
  let httpCode = 500;

  if (err instanceof ApiError) {
    errMsg = err.message;
    httpCode = err.httpCode;
  }

  return { errMsg, httpCode };
}
