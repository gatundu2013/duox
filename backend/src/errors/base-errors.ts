import { BaseErrorI } from "../types/error";

export class BaseError extends Error {
  protected internalMessage: string;
  protected isOperational: boolean;
  protected timeStamp: Date;

  constructor(params: BaseErrorI) {
    super(params.message);

    this.name = params.name ?? "BaseError";
    this.internalMessage = params.internalMessage ?? params.message;
    this.isOperational = params.isOperational;
    this.timeStamp = params.timeStamp ?? new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ApiError extends BaseError {
  public httpCode: number;

  constructor(params: BaseErrorI & { httpCode: number }) {
    super(params);
    this.httpCode = params.httpCode;
  }
}
