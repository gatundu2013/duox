import { Redis } from "ioredis";
import { DB_CONFIG } from "../../config/env";
import { ICONS } from "../../utils/icons";

// Initialize Redis client with lazy connection
export const redis = new Redis(DB_CONFIG.REDIS_URL, {
  lazyConnect: true,
  retryStrategy: () => null, // Disable reconnect initially
});

export async function connectRedis(
  maxRetries = 5,
  retryDelay = 2000
): Promise<void> {
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      await redis.connect();

      // Re-enable retry strategy for automatic reconnection
      redis.options.retryStrategy = (times) => {
        if (times > 20) {
          return null;
        }
        return Math.min(2000, times * 500);
      };

      console.log(`${ICONS.SUCCESS} Redis connected successfully`);
      return;
    } catch (err) {
      console.error(
        `${ICONS.FAILURE} Redis connection attempt ${attempt}/${maxRetries} failed:`,
        err
      );

      if (attempt === maxRetries) {
        console.error(`${ICONS.FAILURE} All Redis connection attempts failed`);
        throw err;
      }

      // Exponential backoff delay
      const exponentialDelay = retryDelay * attempt;
      console.log(`${ICONS.INFO} Retrying in ${exponentialDelay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, exponentialDelay));
      attempt++;
    }
  }
}
