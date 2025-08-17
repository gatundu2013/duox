import jwt from "jsonwebtoken";
import { SelectUserT } from "../db/schema/user";
import { JWT_CONFIG } from "../config/env";

const accessTokenMaxAge = 1000 * 60 * 60; // 1 hour
const refreshTokenMaxAge = 1000 * 60 * 60 * 24 * 7; // 7 days

export function generateAuthTokens(
  params: Pick<SelectUserT, "userId" | "role">
) {
  const { userId, role } = params;

  const accessToken = jwt.sign({ userId, role }, JWT_CONFIG.JWT_ACCESS_SECRET, {
    expiresIn: `${accessTokenMaxAge}`,
  });
  const refreshToken = jwt.sign({ userId }, JWT_CONFIG.JWT_REFRESH_SECRET, {
    expiresIn: `${refreshTokenMaxAge}`,
  });

  return { accessToken, refreshToken };
}
