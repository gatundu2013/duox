import { OtpPurposeEnum } from "../types/shared/auth";

export const otpRedisKeys = {
  getStorageKey: (params: { purpose: OtpPurposeEnum; phoneNumber: string }) => {
    const { purpose, phoneNumber } = params;
    return `otp:${purpose}:${phoneNumber}`;
  },
  getRateLimitKey: (params: {
    purpose: OtpPurposeEnum;
    phoneNumber: string;
  }) => {
    const { purpose, phoneNumber } = params;
    return `otp:rateLimit:${purpose}:${phoneNumber}`;
  },
};
