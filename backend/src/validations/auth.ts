import * as z from "zod";
import { OtpPurposeEnum } from "../types/shared/auth";

const phoneNumberRegex = /^(?:\+254|254|0)(?:7|1)\d{8}$/;
const usernameRegex = /^(?=.{3,20}$)(?!.*__)[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$/;
const reserverdUsernames = ["admin", "support"];

function zodStringInput(name: string) {
  return z.string({
    error: (iss) =>
      iss.input === undefined
        ? `${name} is required`
        : `${name} must be a string`,
  });
}

const phoneNumber = zodStringInput("Phone number")
  .trim()
  .regex(phoneNumberRegex, "Invalid phone number format");

export const registerSchema = z.object({
  phoneNumber,
  username: zodStringInput("Username")
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters long")
    .max(20, "Username cannot exceed 20 characters")
    .regex(usernameRegex, "Invalid username format")
    .refine((username) => !reserverdUsernames.includes(username), {
      error: "Username is reserved",
      path: ["username"],
      abort: true,
    }),
  password: zodStringInput("Password").min(
    4,
    "Password must be at least 4 characters long"
  ),
  otp: zodStringInput("Otp")
    .trim()
    .length(4, "OTP must be exactly 4 digits")
    .regex(/^\d{4}$/, "OTP must contain only numbers"),
  acceptedTerms: z.literal(
    true,
    "You must accept the terms and conditions to continue"
  ),
});

export const loginSchema = z.object({
  phoneNumber,
  password: zodStringInput("Password"),
});

export const resetPasswordSchema = z.object({
  phoneNumber,
  otp: zodStringInput("Otp")
    .trim()
    .length(4, "OTP must be exactly 4 digits")
    .regex(/^\d{4}$/, "OTP must contain only numbers"),
  newPassword: zodStringInput("New password").min(
    4,
    "Password must be at least 4 characters long"
  ),
});

export const changePasswordSchema = z.object({
  phoneNumber,
  oldPassword: zodStringInput("Old password"),
  newPassword: zodStringInput("New password").min(
    4,
    "New password must be at least 4 characters long"
  ),
});

export const requestOtpSchema = z.object({
  phoneNumber,
  purpose: z.enum(Object.values(OtpPurposeEnum), "Invalid otp purpose"),
});

export const refreshAccessTokenSchema = z.object({
  refreshToken: zodStringInput("Refresh token").trim().default(""),
});

export const logoutSchema = z.object({
  refreshToken: zodStringInput("Refresh token").trim().default(""),
  all: z.boolean().default(false),
});
