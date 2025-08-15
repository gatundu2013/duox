import { redis } from "../../db/connection/redis";
import { OTP_PURPOSE } from "../../types/auth";
import { otpRedisKeys } from "../../utils/redis-keys/otp-redis-keys";
import crypto from "node:crypto";

export class OtpService {
  private static readonly MAX_OTP_PER_WINDOW = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 1000 * 60 * 5; // 5 minutes
  private static readonly OTP_EXPIRY_MS = 1000 * 60 * 3; // 3 minutes
  private static readonly RATE_LIMIT_KEY_EXPIRY_SECONDS = 1800; // 30 minutes

  public async generateOtp(params: {
    phoneNumber: string;
    purpose: OTP_PURPOSE;
  }): Promise<boolean> {
    const { phoneNumber, purpose } = params;
    const { getStorageKey, getRateLimitKey } = otpRedisKeys;

    const otpStorageKey = getStorageKey({ phoneNumber, purpose });
    const rateLimitKey = getRateLimitKey({ phoneNumber, purpose });

    const canRequest = await this.canRequestOtp({ phoneNumber, purpose });
    if (!canRequest) {
      throw new Error("Too many OTP requests. Please try again later");
    }

    const otp = crypto.randomInt(1000, 10000).toString();
    await this.sendOtp({ otp, phoneNumber });

    // Get current count before adding new entry
    const currentRateLimitCount = await redis.zcard(rateLimitKey);

    // Store OTP and track request
    await redis.set(otpStorageKey, otp, "PX", OtpService.OTP_EXPIRY_MS);
    await redis.zadd(rateLimitKey, Date.now(), crypto.randomUUID());

    // Set expiry only for new rate limit key
    if (currentRateLimitCount === 0) {
      await redis.expire(
        rateLimitKey,
        OtpService.RATE_LIMIT_KEY_EXPIRY_SECONDS
      );
    }

    return true;
  }

  public async validateOtp(params: {
    otp: string;
    phoneNumber: string;
    purpose: OTP_PURPOSE;
  }): Promise<boolean> {
    const { phoneNumber, purpose, otp } = params;
    const { getStorageKey } = otpRedisKeys;

    const otpStorageKey = getStorageKey({ phoneNumber, purpose });
    const storedOtp = await redis.get(otpStorageKey);

    if (!storedOtp) {
      throw new Error("OTP not found or expired");
    }

    if (storedOtp !== otp) {
      throw new Error("Invalid OTP");
    }

    // Remove OTP after successful validation
    await redis.del(otpStorageKey);

    return true;
  }

  private async canRequestOtp(params: {
    phoneNumber: string;
    purpose: OTP_PURPOSE;
  }): Promise<boolean> {
    const { phoneNumber, purpose } = params;
    const { getRateLimitKey } = otpRedisKeys;

    const cutoffTimestamp = Date.now() - OtpService.RATE_LIMIT_WINDOW_MS;
    const rateLimitKey = getRateLimitKey({ phoneNumber, purpose });

    // Remove expired OTP requests
    await redis.zremrangebyscore(rateLimitKey, 0, cutoffTimestamp);

    const currentRequestCount = await redis.zcard(rateLimitKey);

    return currentRequestCount < OtpService.MAX_OTP_PER_WINDOW;
  }

  private async sendOtp(params: {
    otp: string;
    phoneNumber: string;
  }): Promise<void> {
    const { otp, phoneNumber } = params;
    // TODO: Implement SMS gateway integration
    console.log(`Sending OTP ${otp} to ${phoneNumber}`);
  }
}
