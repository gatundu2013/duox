declare global {
  namespace Express {
    interface Request {
      user: JwtPayloadI;
    }
  }
}

export interface JwtPayloadI {
  userId: string;
  role: string;
}
