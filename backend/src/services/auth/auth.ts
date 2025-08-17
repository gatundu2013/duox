import { and, eq, or } from "drizzle-orm";
import { db, InsertUserT, redis, usersTable } from "../../db";
import { OTP_PURPOSE } from "../../types/auth";
import {
  formatUser,
  generateAuthTokens,
  standardizePhoneNumber,
  userRedisKeys,
} from "../../utils";
import {
  ChangePasswordPayloadT,
  loginPayloadT,
  RegisterPayloadT,
  RequestOtpPayloadT,
  ResetPasswordPayloadT,
} from "../../validations";
import { OtpService } from "../otp/otp";
import bcrypt from "bcrypt";
import crypto from "node:crypto";

const otpService = new OtpService();

export class AuthService {
  public async register(registrationData: RegisterPayloadT) {
    const { phoneNumber, username, otp, password, acceptedTerms } =
      registrationData;

    if (!acceptedTerms)
      throw new Error("Terms and conditions must be accepted");

    const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);
    const standardizedUsername = username.toLowerCase();

    // Validate OTP
    await otpService.validateOtp({
      otp,
      phoneNumber: standardizedPhoneNumber,
      purpose: OTP_PURPOSE.REGISTER,
    });

    // Check for existing user
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, standardizedUsername),
          eq(usersTable.phoneNumber, standardizedPhoneNumber)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      const user = existingUser[0];
      if (user.username === standardizedUsername)
        throw new Error("Username already exists");
      if (user.phoneNumber === standardizedPhoneNumber)
        throw new Error("Phone number already exists");
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const newUserData: InsertUserT = {
      userId,
      username: standardizedUsername,
      phoneNumber: standardizedPhoneNumber,
      password: hashedPassword,
    };

    const [createdUser] = await db
      .insert(usersTable)
      .values(newUserData)
      .returning();

    // Cache user balance only
    await this.cacheUserBalanceInRedis({
      userId,
      balance: createdUser.accountBalance,
    });

    const authTokens = generateAuthTokens({ userId, role: "player" });
    const formattedUser = formatUser({ userData: createdUser });

    return {
      message: "Account created successfully",
      authTokens,
      userData: formattedUser,
    };
  }

  public async login(params: loginPayloadT) {
    const standardizedPhoneNumber = standardizePhoneNumber(params.phoneNumber);

    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

    if (!existingUser) throw new Error("Account does not exist");

    const isPasswordValid = await bcrypt.compare(
      params.password,
      existingUser.password
    );
    if (!isPasswordValid) throw new Error("Invalid credentials");

    await this.reconstructUserBalance(existingUser.userId);

    const authTokens = generateAuthTokens({
      userId: existingUser.userId,
      role: existingUser.role,
    });
    const formattedUser = formatUser({ userData: existingUser });

    return {
      message: "Logged in successfully",
      authTokens,
      userData: formattedUser,
    };
  }

  public async resetPassword(params: ResetPasswordPayloadT) {
    const standardizedPhoneNumber = standardizePhoneNumber(params.phoneNumber);

    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

    if (!existingUser) throw new Error("Account does not exist");

    await otpService.validateOtp({
      phoneNumber: standardizedPhoneNumber,
      purpose: OTP_PURPOSE.RESET_PASSWORD,
      otp: params.otp,
    });

    const hashedPassword = await bcrypt.hash(params.newPassword, 10);

    const [updatedUser] = await db
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.userId, existingUser.userId))
      .returning();

    await this.reconstructUserBalance(existingUser.userId);

    const authTokens = generateAuthTokens({
      userId: updatedUser.userId,
      role: updatedUser.role,
    });
    const formattedUser = formatUser({ userData: updatedUser });

    return {
      message: "Password reset successfully",
      authTokens,
      userData: formattedUser,
    };
  }

  public async changePassword(params: ChangePasswordPayloadT) {
    const standardizedPhoneNumber = standardizePhoneNumber(params.phoneNumber);

    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

    if (!existingUser) throw new Error("Account does not exist");

    const isOldPasswordValid = await bcrypt.compare(
      params.oldPassword,
      existingUser.password
    );
    if (!isOldPasswordValid) throw new Error("Wrong old password");

    const hashedPassword = await bcrypt.hash(params.newPassword, 10);

    const [updatedUser] = await db
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.userId, existingUser.userId))
      .returning();

    const authTokens = generateAuthTokens({
      userId: updatedUser.userId,
      role: updatedUser.role,
    });
    const formattedUser = formatUser({ userData: updatedUser });

    return {
      message: "Password changed successfully",
      authTokens,
      userData: formattedUser,
    };
  }

  public async getCurrentUser(params: { userId: string }) {
    const { userId } = params;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.userId, userId), eq(usersTable.isActive, true)));

    if (!user) {
      throw new Error("Account does not exist or is inactive");
    }

    return formatUser({ userData: user });
  }

  public async requestOtp(params: RequestOtpPayloadT) {
    const standardizedPhoneNumber = standardizePhoneNumber(params.phoneNumber);

    if (params.purpose === OTP_PURPOSE.REGISTER) {
      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

      if (existingUser) throw new Error("Phone number already exists");
    }

    await otpService.generateOtp({
      phoneNumber: standardizedPhoneNumber,
      purpose: params.purpose,
    });
  }

  public async reconstructUserBalance(userId: string): Promise<void> {
    const balanceKey = userRedisKeys.getBalanceStorageKey({ userId });
    const balance = await redis.get(balanceKey);

    if (!balance) {
      // TODO: Implement balance reconstruction logic from DB/pending ops
    }
  }

  private async cacheUserBalanceInRedis(params: {
    userId: string;
    balance: string;
  }): Promise<void> {
    const balanceKey = userRedisKeys.getBalanceStorageKey({
      userId: params.userId,
    });
    const CACHE_EXPIRATION_SECONDS = 86400; // 1 day
    try {
      await redis.set(
        balanceKey,
        params.balance,
        "EX",
        CACHE_EXPIRATION_SECONDS
      );
    } catch (err) {
      console.error(`Failed to cache balance for user ${params.userId}:`, err);
    }
  }
}
