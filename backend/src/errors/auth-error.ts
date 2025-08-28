import { ApiErrorI } from "../types/backend/error";
import { ApiError } from "./base-errors";

export class AuthError extends ApiError {
  constructor(params: ApiErrorI) {
    super({ ...params, name: "Auth Error" });
  }
}
