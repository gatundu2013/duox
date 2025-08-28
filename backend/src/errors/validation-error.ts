import { ApiErrorI } from "../types/backend/error";
import { ApiError } from "./base-errors";

export class ValidationError extends ApiError {
  constructor(params: ApiErrorI) {
    super({ ...params, name: "Validation error" });
  }
}
