import { eq, or } from "drizzle-orm";
import { db, InsertUserT, redis, SelectUserT, usersTable } from "../../db";
import { OTP_PURPOSE } from "../../types/auth";
import {
  formatUser,
  generateAuthTokens,
  standardizePhoneNumber,
  userRedisKeys,
} from "../../utils";
import {
  loginPayloadT,
  RegisterPayloadT,
  RequestOtpPayloadT,
} from "../../validations";
import { OtpService } from "../otp/otp";
import bcrypt from "bcrypt";

const otpService = new OtpService();

export class AuthService {
  public async register(registrationData: RegisterPayloadT) {
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
    await this.cacheUserBalanceInRedis({
      userId,
      balance: createdUser.accountBalance,
    });
    await this.cacheUserProfileInRedis({ userData: createdUser });

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
  }

  public async login(params: loginPayloadT) {
    const { phoneNumber, password } = params;
    const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phoneNumber, standardizedPhoneNumber));

    if (!existingUser) {
      throw new Error("Account does not exist");
    }

    // Validate password
    const hasCorrectPassword = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!hasCorrectPassword) {
      throw new Error("Invalid credentials");
    }

    // Get cached user balance
    const { getBalanceStorageKey } = userRedisKeys;
    const balanceKey = getBalanceStorageKey({ userId: existingUser.userId });

    const balance = await redis.get(balanceKey);

    // Reconstruct balance if balance is not found
    if (!balance) {
      await this.reconstructUserBalance(existingUser.userId);
    }

    await this.cacheUserProfileInRedis({ userData: existingUser });

    // Prepare response
    const authTokens = generateAuthTokens({
      userId: existingUser.userId,
      role: "player",
    });
    const formattedUser = formatUser({ userData: existingUser });

    return {
      message: "Logged In successfully",
      authTokens,
      userData: formattedUser,
    };
  }

  public async requestOtp(params: RequestOtpPayloadT) {
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
  }

  /**
   * Reconstructs user balance - can be used by other methods like reset password
   */
  public async reconstructUserBalance(userId: string): Promise<void> {
    /**
     * BALANCE RECONSTRUCTION LOGIC
     *
     * 1. Attempt to read user's balance from Redis.
     * 2. If Redis cache is missing (cache miss):
     *    - Fetch the last known balance and lastAppliedJobId from Redis or DB.
     *    - Fetch pending operations from Redis (pending_ops:user_{userId}).
     *    - Only include pending ops with jobId > lastAppliedJobId to avoid double-counting.
     *    - Reconstruct the total balance:
     *        reconstructedBalance = lastKnownBalance + sum(filteredPendingOps)
     *    - This snapshot is always safe because:
     *        a) Redis operations are synchronous and ordered, so reading balance + pending ops gives a consistent view.
     *        b) lastJobId ensures that even if a worker has applied a job but failed to remove it from pending_ops, we don't double-count.
     *        c) Any jobs applied after the snapshot will be reflected in the next refresh.
     *    - This allows instant balance display without waiting for queue processing.
     * 3. Optional: Reconcile periodically to clean any stale pending_ops and ensure Redis and DB stay consistent.
     *
     * Notes:
     * - DB is still the source of truth in case Redis fails.
     * - Redis acts as a fast cache and in-flight operation tracker.
     * - This approach guarantees correct balance reconstruction at any moment, even under high concurrency.
     */
    // TODO: Implement balance reconstruction logic here
  }

  /**
   * Caches user data in Redis
   */
  private async cacheUserBalanceInRedis(params: {
    userId: string;
    balance: string;
  }): Promise<void> {
    try {
      const { userId, balance } = params;
      const { getBalanceStorageKey } = userRedisKeys;
      const balanceKey = getBalanceStorageKey({ userId });

      const CACHE_EXPIRATION_SECONDS = 86400; // 1 day

      await redis.set(balanceKey, balance, "EX", CACHE_EXPIRATION_SECONDS);
    } catch (err) {
      console.error(
        `Failed to cache balance for user ${params.userId} in Redis:`,
        err
      );
    }
  }

  private async cacheUserProfileInRedis(params: {
    userData: SelectUserT;
  }): Promise<void> {
    try {
      const { userData } = params;
      const { getProfileStorageKey } = userRedisKeys;
      const profileKey = getProfileStorageKey({ userId: userData.userId });

      const CACHE_EXPIRATION_SECONDS = 86400; // 1 day

      await redis.hset(profileKey, {
        username: userData.username,
        userId: userData.userId,
        phoneNumber: userData.phoneNumber,
        isActive: userData.isActive,
        avatarUrl: userData.avatarUrl,
        createdAt: userData.createdAt,
      });

      await redis.expire(profileKey, CACHE_EXPIRATION_SECONDS);
    } catch (err) {
      console.error(
        `Failed to cache profile for user ${params.userData.userId} in Redis:`,
        err
      );
    }
  }
}
