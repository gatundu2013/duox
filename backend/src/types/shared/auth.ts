import { OtpPurposeEnum } from "./enums";

export const reservedUsernames = ["admin", "support"] as const;

export interface RegisterPayloadI {
  username: string;
  phoneNumber: string;
  password: string;
  otp: string;
  acceptedTerms: true;
}

export interface LoginPayloadI {
  phoneNumber: string;
  password: string;
}

export interface ResetPasswordPayloadI {
  phoneNumber: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordPayloadI {
  phoneNumber: string;
  oldPassword: string;
  newPassword: string;
}

export interface RequestOtpPayloadI {
  phoneNumber: string;
  purpose: OtpPurposeEnum;
}

export interface LogoutPayload {
  refreshToken: string;
  all: boolean;
}

// -------- Responses --------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  phoneNumber: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  accountBalance: string;
  avatarUrl: string | null;
}

export interface RegisterResponse {
  message: "Account created successfully";
  authTokens: AuthTokens;
  userData: UserResponse;
}

export interface LoginResponse {
  message: "Logged in successfully";
  authTokens: AuthTokens;
  userData: UserResponse;
}

export interface ResetPasswordResponse {
  message: "Password reset successfully";
  authTokens: AuthTokens;
  userData: UserResponse;
}

export interface RequestOtpResponse {
  message: "OTP sent successfully";
}

export interface ChangePasswordResponse {
  message: "Password changed successfully";
  authTokens: AuthTokens;
  userData: UserResponse;
}

export interface RefreshAccessTokenResponse {
  message: "Tokens refreshed successfully";
  authTokens: AuthTokens;
}

export interface GetCurrentUserResponse {
  userData: UserResponse;
}

export interface LogoutResponse {
  message:
    | "Logged out successfully from this device"
    | "Logged out from all devices successfully";
}
