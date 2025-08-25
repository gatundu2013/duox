import { NextFunction, Request, Response } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { JWT_CONFIG } from "../config/env";
import { JwtPayloadI } from "../types/auth";

export function requireJwtAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers["authorization"] as string;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        errMsg: "Unauthorized",
        code: "MISSING_TOKEN",
      });
    }

    const accessToken = authHeader.split(" ")[1];

    if (!accessToken || !accessToken.trim()) {
      return res.status(401).json({
        errMsg: "Unauthorized",
        code: "INVALID_TOKEN",
      });
    }

    const payload = jwt.verify(
      accessToken,
      JWT_CONFIG.JWT_ACCESS_SECRET
    ) as JwtPayloadI;

    req.user = payload;

    next();
  } catch (err) {
    console.log(err);
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({
        errMsg: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
    } else {
      return res.status(401).json({
        errMsg: "Unauthorized",
        code: "INVALID_TOKEN",
      });
    }
  }
}
