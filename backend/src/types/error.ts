export interface BaseErrorI {
  name?: string;
  message: string;
  isOperational: boolean;
  internalMessage?: string;
  timeStamp?: Date;
}

export interface ApiErrorI extends BaseErrorI {
  httpCode: number;
}
