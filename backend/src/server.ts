import "./config/env";
import { connectPostgres } from "./db/connection/postgres";
import { connectRedis } from "./db/connection/redis";
import { OtpService } from "./services/otp/otp";
import { OTP_PURPOSE } from "./types/auth";

connectPostgres();
connectRedis();

const otpService = new OtpService();

otpService.generateOtp({
  phoneNumber: "0740774613",
  purpose: OTP_PURPOSE.REGISTER,
});
