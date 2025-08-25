import { redis } from "../../db";
import { AuthError } from "../../errors";
import { OtpPurposeEnum } from "../../types";
import { otpRedisKeys } from "../../utils";
import crypto from "node:crypto";

export class OtpService {
  private static readonly MAX_OTP_PER_WINDOW = 5; // Maximum OTPs per time window
  private static readonly RATE_LIMIT_WINDOW_MS = 1000 * 60 * 5; // 5 minutes

  // OTP configuration
  private static readonly OTP_EXPIRY_MS = 1000 * 60 * 3; // 5 minutes
  private static readonly RATE_LIMIT_KEY_EXPIRY_SEC = 1800; // 30 minutes

  public async generateAndSendOtp(params: {
    phoneNumber: string;
    purpose: OtpPurposeEnum;
  }) {
    const { phoneNumber, purpose } = params;

    // Generate Redis keys for OTP storage and rate limiting
    const { getStorageKey, getRateLimitKey } = otpRedisKeys;
    const otpStorageKey = getStorageKey({ phoneNumber, purpose });
    const rateLimitKey = getRateLimitKey({ phoneNumber, purpose });

    const canRequestOtp = await this.canRequestOtp({ phoneNumber, purpose });

    if (!canRequestOtp) {
      throw new AuthError({
        httpCode: 429,
        isOperational: true,
        message: "Too many OTP requests. Please try again later",
      });
    }

    // Generate 4-digit OTP (1001-9999 range ensures 4 digits)
    const otp = crypto.randomInt(1001, 10000).toString();

    // Send OTP via SMS
    await this.sendOtp({ otp, phoneNumber });

    // Get current rate limit count before adding new request
    const currentRateLimitCount = await redis.zcard(rateLimitKey);

    // Store OTP with expiration time
    await redis.set(otpStorageKey, otp, "PX", OtpService.OTP_EXPIRY_MS);

    // Add current timestamp to rate limit tracking (using UUID as unique member)
    await redis.zadd(rateLimitKey, Date.now(), crypto.randomUUID());

    // If this is the first OTP request for this phone+purpose combination,
    // set an expiration on the rate limit key to prevent indefinite storage
    if (currentRateLimitCount === 0) {
      await redis.expire(rateLimitKey, OtpService.RATE_LIMIT_KEY_EXPIRY_SEC);
    }
  }

  public async validateOtp(params: {
    otp: string;
    phoneNumber: string;
    purpose: OtpPurposeEnum;
  }) {
    const { phoneNumber, purpose, otp } = params;

    // Generate storage key for the OTP
    const { getStorageKey } = otpRedisKeys;
    const otpStorageKey = getStorageKey({ phoneNumber, purpose });

    // Retrieve stored OTP from Redis
    const storedOtp = await redis.get(otpStorageKey);

    if (!storedOtp) {
      return {
        isValid: false,
        message: "OTP not found or expired",
      };
    }

    // Validate OTP match
    if (storedOtp !== otp) {
      return {
        isValid: false,
        message: "Invalid OTP",
      };
    }

    // Clean up OTP after successful validation (one-time use)
    await redis.del(otpStorageKey);

    return {
      isValid: true,
      message: "OTP is valid",
    };
  }

  private async canRequestOtp(params: {
    phoneNumber: string;
    purpose: OtpPurposeEnum;
  }) {
    const { phoneNumber, purpose } = params;

    // Generate rate limit key
    const { getRateLimitKey } = otpRedisKeys;
    const rateLimitKey = getRateLimitKey({ phoneNumber, purpose });

    // Calculate cutoff timestamp for rate limit window
    const cutoffTimestamp = Date.now() - OtpService.RATE_LIMIT_WINDOW_MS;

    // Remove expired entries from the sorted set
    await redis.zremrangebyscore(rateLimitKey, 0, cutoffTimestamp);

    // Count current requests within the time window
    const otpRequestsInWindow = await redis.zcard(rateLimitKey);

    // Allow request if under the limit
    return otpRequestsInWindow < OtpService.MAX_OTP_PER_WINDOW;
  }

  private async sendOtp(params: { otp: string; phoneNumber: string }) {
    const { otp, phoneNumber } = params;

    // TODO: Implement SMS gateway integration
    console.log(`OTP ${otp} sent to ${phoneNumber}`);
  }
}
