import { eq, or } from "drizzle-orm";
import { db, InsertUserT, redis, SelectUserT, usersTable } from "../../db";
import { OTP_PURPOSE } from "../../types/auth";
import {
  formatUser,
  generateAuthTokens,
  standardizePhoneNumber,
  userRedisKeys,
} from "../../utils";
import { RegisterPayloadT, RequestOtpPayloadT } from "../../validations";
import { OtpService } from "../otp/otp";
import bcrypt from "bcrypt";

const otpService = new OtpService();

export class AuthService {
  public async register(registrationData: RegisterPayloadT) {
    try {
      const { phoneNumber, username, otp, password, acceptedTerms } =
        registrationData;

      // Standardize username and phoneNumber
      const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);
      const standardizedUsername = username.toLowerCase();

      if (acceptedTerms !== true) {
        throw new Error("Terms and conditions must be accepted");
      }

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
        if (user.username === standardizedUsername) {
          throw new Error("Username already exist");
        }
        if (user.phoneNumber === standardizedPhoneNumber) {
          throw new Error("Phone number already exist");
        }
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

      // Cache user data in Redis
      await this.cacheUserDataInRedis(createdUser);

      // Prepare response
      const authTokens = generateAuthTokens({
        userId,
        role: "player",
      });
      const formattedUser = formatUser({ userData: createdUser });

      return {
        message: "Account created successfully",
        authTokens,
        userData: formattedUser,
      };
    } catch (err) {
      throw err;
    }
  }

  public async requestOtp(params: RequestOtpPayloadT) {
    try {
      const { phoneNumber, purpose } = params;
      const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);

      // Prevent registration otp request for existing account
      if (purpose === OTP_PURPOSE.REGISTER) {
        const [existingUser] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

        if (existingUser) {
          throw new Error("Phone number already exist");
        }
      }

      // Generates and send otp to phoneNumber
      await otpService.generateOtp({
        phoneNumber: standardizedPhoneNumber,
        purpose,
      });
    } catch (err) {
      throw err;
    }
  }

  public async login() {}
  public async resetPassword() {}
  public async changePassword() {}

  /**
   * Caches user data in Redis
   */
  private async cacheUserDataInRedis(userData: SelectUserT): Promise<void> {
    try {
      // Prepare Redis keys
      const { getBalanceStorageKey, getProfileStorageKey } = userRedisKeys;
      const balanceKey = getBalanceStorageKey({ userId: userData.userId });
      const profileKey = getProfileStorageKey({ userId: userData.userId });

      const pipeline = redis.pipeline();

      pipeline.set(balanceKey, userData.accountBalance);
      pipeline.hset(profileKey, {
        username: userData.username,
        userId: userData.userId,
        phoneNumber: userData.phoneNumber,
        isActive: userData.isActive,
        avatarUrl: userData.avatarUrl,
        createdAt: userData.createdAt,
      });

      // Set cache expiration
      const CACHE_EXPIRATION_SECONDS = 86400;
      pipeline.expire(balanceKey, CACHE_EXPIRATION_SECONDS);
      pipeline.expire(profileKey, CACHE_EXPIRATION_SECONDS);

      const results = await pipeline.exec();

      results?.forEach(([err], index) => {
        if (err) {
          console.error(`Redis pipeline command #${index} failed:`, err);
        }
      });
    } catch (err) {
      // Log Redis error but don't fail registration
      console.error("Failed to cache user data in Redis:", err);
    }
  }
}
