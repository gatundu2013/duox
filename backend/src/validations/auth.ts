import * as z from "zod";

export const phoneNumberRegex = /^(?:\+254|254|0)(?:7|1)\d{8}$/;
export const usernameRegex =
  /^(?=.{3,20}$)(?!.*__)[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$/;
export const reserverdUsernames = ["admin", "support"];

export const registerSchema = z.strictObject({
  username: z
    .string()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters long")
    .max(20, "Username cannot exceed 20 characters")
    .regex(usernameRegex, "Invalid username format")
    .refine((username) => !reserverdUsernames.includes(username), {
      error: "Username is reserved",
      path: ["username"],
      abort: true,
    }),
  phoneNumber: z
    .string()
    .regex(phoneNumberRegex, "Invalid phone number format"),
  password: z.string().min(4, "Password must be at least 4 characters long"),
  otp: z
    .string()
    .length(4, "OTP must be exactly 4 digits")
    .regex(/^\d{4}$/, "OTP must contain only numbers"),
  acceptedTerms: z.literal(
    true,
    "You must accept the terms and conditions to continue"
  ),
});
