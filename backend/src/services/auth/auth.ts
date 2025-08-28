import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/connection/postgres";
import { redis } from "../../db/connection/redis";
import { usersTable, SelectUserT, InsertUserT } from "../../db/schema/user";
import { standardizePhoneNumber } from "../../utils/standardize-phone-number";
import { userRedisKeys } from "../../redis-keys/user-key";
import { OtpService } from "../otp/otp";
import { BalanceService } from "../balance/balance";
import bcrypt from "bcrypt";
import {
  ChangePasswordPayloadI,
  ChangePasswordResponse,
  GetCurrentUserResponse,
  LoginPayloadI,
  LoginResponse,
  LogoutPayload,
  LogoutResponse,
  OtpPurposeEnum,
  RefreshAccessTokenResponse,
  RegisterPayloadI,
  RegisterResponse,
  RequestOtpPayloadI,
  RequestOtpResponse,
  ResetPasswordPayloadI,
  ResetPasswordResponse,
  UserRoleEnum,
} from "../../types/shared/auth";
import { JwtPayloadI } from "../../types/backend/auth";
import { JWT_CONFIG } from "../../config/env";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ApiError } from "../../errors/base-errors";
import { AuthError } from "../../errors/auth-error";

const otpService = new OtpService();
const balanceService = new BalanceService();

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY_SECONDS = 60 * 30; // 30 minutes
  private static readonly REFRESH_TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days
  private static readonly BCRYPT_SALT_ROUNDS = 10;

  public async register(params: RegisterPayloadI): Promise<RegisterResponse> {
    const { phoneNumber, username, password, otp, acceptedTerms } = params;

    // Terms and conditions must be accepted
    if (!acceptedTerms) {
      throw new AuthError({
        httpCode: 400,
        isOperational: true,
        message: "Terms and conditions must be accepted",
      });
    }

    // Standardize inputs
    const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);
    const standardizedUsername = username.toLowerCase();

    // Check for existing users with same username or phone number
    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, standardizedUsername),
          eq(usersTable.phoneNumber, standardizedPhoneNumber)
        )
      )
      .limit(1);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];

      if (user.username === standardizedUsername) {
        throw new AuthError({
          httpCode: 409,
          isOperational: true,
          message: "Username already exists",
        });
      }

      if (user.phoneNumber === standardizedPhoneNumber) {
        throw new AuthError({
          httpCode: 409,
          isOperational: true,
          message: "Phone number already exists",
        });
      }
    }

    // Validate OTP before creating account
    const { isValid, message } = await otpService.validateOtp({
      otp,
      phoneNumber: standardizedPhoneNumber,
      purpose: OtpPurposeEnum.REGISTER,
    });

    if (!isValid) {
      throw new AuthError({
        httpCode: 401,
        isOperational: true,
        message,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      AuthService.BCRYPT_SALT_ROUNDS
    );

    // Prepare user data
    const newUserData: InsertUserT = {
      username: standardizedUsername,
      phoneNumber: standardizedPhoneNumber,
      password: hashedPassword,
    };

    // Create new user in database
    const [createdUser] = await db
      .insert(usersTable)
      .values(newUserData)
      .returning();

    await balanceService.cacheUserBalanceInRedis({
      userId: createdUser.userId,
      balance: createdUser.accountBalance,
    });

    const { accessToken, refreshToken, jwtId } = this.generateAuthTokens({
      userId: createdUser.userId,
    });

    await this.storeRefreshTokenInRedis({
      userId: createdUser.userId,
      jwtId,
    });

    const formattedUser = this.formatUser({ userData: createdUser });

    return {
      message: "Account created successfully",
      authTokens: {
        accessToken,
        refreshToken,
      },
      userData: formattedUser,
    };
  }

  public async login(params: LoginPayloadI): Promise<LoginResponse> {
    const { phoneNumber, password } = params;

    const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);

    // Find active user
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.phoneNumber, standardizedPhoneNumber),
          eq(usersTable.isActive, true)
        )
      );

    if (!existingUser) {
      throw new AuthError({
        httpCode: 404,
        isOperational: true,
        message: "Account does not exist or is inactive",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      throw new AuthError({
        httpCode: 401,
        isOperational: true,
        message: "Invalid credentials",
      });
    }

    // Ensure user balance is available in cache (critical for operations)
    await balanceService.ensureBalanceExistsInRedisCache({
      userId: existingUser.userId,
    });

    const { accessToken, refreshToken, jwtId } = this.generateAuthTokens({
      userId: existingUser.userId,
      role: existingUser.role,
    });

    // Store refresh token for validation
    await this.storeRefreshTokenInRedis({
      userId: existingUser.userId,
      jwtId,
    });

    const formattedUser = this.formatUser({ userData: existingUser });

    return {
      message: "Logged in successfully",
      authTokens: {
        accessToken,
        refreshToken,
      },
      userData: formattedUser,
    };
  }

  public async resetPassword(
    params: ResetPasswordPayloadI
  ): Promise<ResetPasswordResponse> {
    const { phoneNumber, otp, newPassword } = params;
    const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);

    // Find active user
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.phoneNumber, standardizedPhoneNumber),
          eq(usersTable.isActive, true)
        )
      );

    if (!existingUser) {
      throw new AuthError({
        httpCode: 404,
        isOperational: true,
        message: "Account does not exist or is inactive",
      });
    }

    // Validate OTP for password reset
    const { isValid, message } = await otpService.validateOtp({
      phoneNumber: standardizedPhoneNumber,
      purpose: OtpPurposeEnum.RESET_PASSWORD,
      otp,
    });

    if (!isValid) {
      throw new AuthError({
        httpCode: 401,
        isOperational: true,
        message,
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      AuthService.BCRYPT_SALT_ROUNDS
    );

    // Update password in database
    const [updatedUser] = await db
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.userId, existingUser.userId))
      .returning();

    // Security measure: invalidate all existing sessions
    await this.invalidateAllUserRefreshTokens({
      userId: existingUser.userId,
    });

    // Ensure balance cache is available (critical for operations)
    await balanceService.ensureBalanceExistsInRedisCache({
      userId: existingUser.userId,
    });

    const { accessToken, refreshToken, jwtId } = this.generateAuthTokens({
      userId: updatedUser.userId,
      role: updatedUser.role,
    });

    await this.storeRefreshTokenInRedis({
      userId: updatedUser.userId,
      jwtId,
    });

    const formattedUser = this.formatUser({ userData: updatedUser });

    return {
      message: "Password reset successfully",
      authTokens: {
        accessToken,
        refreshToken,
      },
      userData: formattedUser,
    };
  }

  public async requestOtp(
    params: RequestOtpPayloadI
  ): Promise<RequestOtpResponse> {
    const standardizedPhoneNumber = standardizePhoneNumber(params.phoneNumber);

    // For registration, ensure phone number isn't already taken
    if (params.purpose === OtpPurposeEnum.REGISTER) {
      const existingUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

      if (existingUser.length > 0) {
        throw new AuthError({
          httpCode: 409,
          isOperational: true,
          message: "Phone number already exists",
        });
      }
    }

    await otpService.generateAndSendOtp({
      phoneNumber: standardizedPhoneNumber,
      purpose: params.purpose,
    });

    return { message: "OTP sent successfully" };
  }

  public async changePassword(
    params: ChangePasswordPayloadI
  ): Promise<ChangePasswordResponse> {
    const { phoneNumber, oldPassword, newPassword } = params;

    const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);

    // Find existing user
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

    if (!existingUser) {
      throw new AuthError({
        httpCode: 404,
        isOperational: true,
        message: "Account does not exist",
      });
    }

    // Verify current password
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      existingUser.password
    );

    if (!isOldPasswordValid) {
      throw new AuthError({
        httpCode: 401,
        isOperational: true,
        message: "Incorrect old password",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      AuthService.BCRYPT_SALT_ROUNDS
    );

    // Update password in database
    const [updatedUser] = await db
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.userId, existingUser.userId))
      .returning();

    // Security measure: invalidate all refresh tokens
    await this.invalidateAllUserRefreshTokens({
      userId: existingUser.userId,
    });

    const { accessToken, refreshToken, jwtId } = this.generateAuthTokens({
      userId: updatedUser.userId,
      role: updatedUser.role,
    });

    await this.storeRefreshTokenInRedis({
      userId: updatedUser.userId,
      jwtId,
    });

    const formattedUser = this.formatUser({ userData: updatedUser });

    return {
      message: "Password changed successfully",
      authTokens: {
        accessToken,
        refreshToken,
      },
      userData: formattedUser,
    };
  }

  public async refreshAccessToken(params: {
    refreshToken: string;
  }): Promise<RefreshAccessTokenResponse> {
    try {
      // Verify and decode refresh token
      const payload = jwt.verify(
        params.refreshToken,
        JWT_CONFIG.JWT_REFRESH_SECRET
      ) as JwtPayloadI & JwtPayload;

      const { userId, jti } = payload;

      if (!userId || !jti) {
        throw new AuthError({
          httpCode: 401,
          isOperational: true,
          message: "Invalid token format",
        });
      }

      // Verify user exists and is active
      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(
          and(eq(usersTable.userId, userId), eq(usersTable.isActive, true))
        );

      if (!existingUser) {
        throw new AuthError({
          httpCode: 404,
          isOperational: true,
          message: "Account not found or inactive",
        });
      }

      // Validate refresh token exists in Redis
      const { isValid, message } = await this.validateRefreshTokenInRedis({
        userId,
        jwtId: jti,
      });

      if (!isValid) {
        throw new AuthError({ httpCode: 401, isOperational: true, message });
      }

      // Remove old refresh token (token rotation for security)
      await this.invalidateRefreshToken({
        userId,
        jwtId: jti,
      });

      const {
        refreshToken,
        accessToken,
        jwtId: newJwtId,
      } = this.generateAuthTokens({
        userId,
        role: existingUser.role,
      });

      await this.storeRefreshTokenInRedis({
        userId,
        jwtId: newJwtId,
      });

      return {
        message: "Tokens refreshed successfully",
        authTokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (err) {
      // Re-throw API errors as-is
      if (err instanceof ApiError) {
        throw err;
      }

      // Handle JWT verification errors
      throw new AuthError({
        httpCode: 401,
        isOperational: true,
        message: "Session expired. Login required",
      });
    }
  }

  public async getCurrentUser(params: {
    userId: string;
  }): Promise<GetCurrentUserResponse> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(eq(usersTable.userId, params.userId), eq(usersTable.isActive, true))
      );

    if (!user) {
      throw new AuthError({
        httpCode: 404,
        isOperational: true,
        message: "User not found or inactive",
      });
    }

    // Ensure balance cache is up to date (critical for operations)
    await balanceService.ensureBalanceExistsInRedisCache({
      userId: user.userId,
    });

    const formattedUser = this.formatUser({ userData: user });

    return { userData: formattedUser };
  }

  public async logout(params: LogoutPayload): Promise<LogoutResponse> {
    try {
      const { refreshToken, all } = params;

      if (!refreshToken) {
        return { message: "Logged out successfully from this device" };
      }

      const payload = jwt.decode(refreshToken) as JwtPayload & JwtPayloadI;

      if (!payload.userId || !payload.jti) {
        console.log("Logout: Invalid refresh token payload");
        return { message: "Logged out successfully from this device" };
      }

      const { userId, jwtId } = payload;

      if (all) {
        await this.invalidateAllUserRefreshTokens({ userId });
        return { message: "Logged out from all devices successfully" };
      }

      await this.invalidateRefreshToken({ userId, jwtId });
      return { message: "Logged out successfully from this device" };
    } catch (err) {
      console.log("Logout error:", err);
      return { message: "Logged out successfully from this device" };
    }
  }

  // --------- Internals -------------

  private generateAuthTokens(params: { userId: string; role?: UserRoleEnum }) {
    const normalizedParams = {
      role: UserRoleEnum.PLAYER,
      ...params,
    };

    const { userId, role } = normalizedParams;
    const jwtId = crypto.randomUUID();

    const accessToken = jwt.sign(
      { userId, role },
      JWT_CONFIG.JWT_ACCESS_SECRET,
      { expiresIn: `${AuthService.ACCESS_TOKEN_EXPIRY_SECONDS}s` }
    );

    const refreshToken = jwt.sign({ userId }, JWT_CONFIG.JWT_REFRESH_SECRET, {
      expiresIn: `${AuthService.REFRESH_TOKEN_EXPIRY_SECONDS}s`,
      jwtid: jwtId,
    });

    return { accessToken, refreshToken, jwtId };
  }

  private formatUser(params: { userData: SelectUserT }) {
    const { userData } = params;
    return {
      phoneNumber: userData.phoneNumber,
      username: userData.username,
      isActive: userData.isActive,
      createdAt: userData.createdAt,
      accountBalance: userData.accountBalance,
      avatarUrl: userData.avatarUrl,
    };
  }

  // ------ REDIS CACHE OPERATIONS ---------

  private async storeRefreshTokenInRedis(params: {
    userId: string;
    jwtId: string;
  }) {
    try {
      const jwtKey = userRedisKeys.getJwtRefreshTokensStorageKey({
        userId: params.userId,
      });
      // Add JWT ID to user's refresh token set
      await redis.sadd(jwtKey, params.jwtId);
      await redis.expire(jwtKey, AuthService.REFRESH_TOKEN_EXPIRY_SECONDS);
    } catch (err) {
      console.error(
        `Failed to store refresh token for user ${params.userId}:`,
        err
      );
      // Don't throw - caching failures shouldn't break main operations
    }
  }

  private async validateRefreshTokenInRedis(params: {
    userId: string;
    jwtId: string;
  }) {
    try {
      const refreshTokenKey = userRedisKeys.getJwtRefreshTokensStorageKey({
        userId: params.userId,
      });

      const isTokenValid = await redis.sismember(refreshTokenKey, params.jwtId);

      if (!isTokenValid) {
        return {
          isValid: false,
          message: "Session expired. Login required",
        };
      }

      return { isValid: true, message: "" };
    } catch (error) {
      // Redis connection/other errors - fail secure
      console.error(
        `Redis validation failed for user ${params.userId}:`,
        error
      );

      throw new AuthError({
        httpCode: 503,
        isOperational: true,
        message: "Authentication service temporarily unavailable",
      });
    }
  }

  private async invalidateRefreshToken(params: {
    userId: string;
    jwtId: string;
  }) {
    try {
      const jwtKey = userRedisKeys.getJwtRefreshTokensStorageKey({
        userId: params.userId,
      });
      await redis.srem(jwtKey, params.jwtId);
    } catch (error) {
      console.error(
        `Failed to invalidate refresh token for user ${params.userId}:`,
        error
      );
      // Don't throw - this is cleanup operation
    }
  }

  private async invalidateAllUserRefreshTokens(params: { userId: string }) {
    try {
      const jwtKey = userRedisKeys.getJwtRefreshTokensStorageKey({
        userId: params.userId,
      });
      await redis.del(jwtKey);
    } catch (error) {
      console.error(
        `Failed to invalidate all refresh tokens for user ${params.userId}:`,
        error
      );
      // Don't throw - caching failures shouldn't break main operations
      // Tokens will expired eventually
    }
  }
}
