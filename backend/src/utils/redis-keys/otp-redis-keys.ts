import { OTP_PURPOSE } from "../../types/auth";

export const otpRedisKeys = {
  getStorageKey: (params: { purpose: OTP_PURPOSE; phoneNumber: string }) => {
    const { purpose, phoneNumber } = params;
    return `otp:${purpose}:${phoneNumber}`;
  },
  getRateLimitKey: (params: { purpose: OTP_PURPOSE; phoneNumber: string }) => {
    const { purpose, phoneNumber } = params;
    return `otp:rateLimit:${purpose}:${phoneNumber}`;
  },
};
