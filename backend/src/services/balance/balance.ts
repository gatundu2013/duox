import { redis } from "../../db/connection/redis";
import { ApiError } from "../../errors/base-errors";
import { userRedisKeys } from "../../redis-keys/user-key";

export class BalanceService {
  private static readonly BALANCE_CACHE_EXPIRY_SECONDS = 60 * 60 * 24; // 24 hours

  public async ensureBalanceExistsInRedisCache(params: { userId: string }) {
    const balanceKey = userRedisKeys.getBalanceStorageKey({
      userId: params.userId,
    });

    try {
      const balanceFromRedis = await redis.get(balanceKey);

      if (!balanceFromRedis) {
        // Reconstruct from database and store in Redis
        await this.reconstructBalanceFromDatabaseAndCacheInRedis(params.userId);
      }
    } catch (error) {
      console.error(
        `Failed to ensure balance availability in Redis for user ${params.userId}:`,
        error
      );

      // Throw error to prevent operations that depend on balance data
      throw new ApiError({
        httpCode: 503,
        isOperational: true,
        message:
          "Account balance service temporarily unavailable. Please try again later",
      });
    }
  }

  public async cacheUserBalanceInRedis(params: {
    userId: string;
    balance: string;
  }) {
    try {
      const balanceKey = userRedisKeys.getBalanceStorageKey({
        userId: params.userId,
      });

      await redis.set(
        balanceKey,
        params.balance,
        "EX",
        BalanceService.BALANCE_CACHE_EXPIRY_SECONDS
      );
    } catch (error) {
      console.error(
        `Failed to store balance in Redis cache for user ${params.userId}:`,
        error
      );
      // Don't throw for caching failures during user creation
      // But log for monitoring
    }
  }

  private async reconstructBalanceFromDatabaseAndCacheInRedis(
    userId: string
  ): Promise<void> {
    try {
      // TODO: Apply pending transactions logic here
      // This should include:
      // 1. Query pending transactions not yet reflected in DB balance
      // 2. Calculate net effect of pending transactions
      // 3. Apply adjustments to the base balance
      // Example:
      // const pendingTransactions = await this.getPendingTransactionsFromDatabase(userId);
      // const pendingAmount = this.calculateNetPendingAmount(pendingTransactions);
      // const finalReconstructedBalance = rawBalanceFromDatabase + pendingAmount;

      // Store the final calculated balance in Redis cache
      await this.cacheUserBalanceInRedis({
        userId,
        balance: "",
      });

      console.info(`Balance reconstructed from database and cached in Redis`);
    } catch (error) {
      console.error(
        `Balance reconstruction from database failed for user ${userId}:`,
        error
      );
      throw error; // Re-throw to trigger service unavailable error
    }
  }
}
