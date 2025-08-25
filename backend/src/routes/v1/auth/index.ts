import { Router } from "express";
import { AuthController } from "../../../controllers/v1";
import { requireJwtAuth } from "../../../middlewares";

export const authRouterV1 = Router();
const authController = new AuthController();

// -------- Public routes --------
authRouterV1.post("/login", authController.login);
authRouterV1.post("/register", authController.register);
authRouterV1.post("/request_otp", authController.requestOtp);
authRouterV1.post("/reset_password", authController.resetPassword);
authRouterV1.post("/refresh_token", authController.refreshAccessToken);
authRouterV1.post("/logout", authController.logout);

// -------- Protected routes --------
authRouterV1.get("/me", requireJwtAuth, authController.getCurrentUser);
authRouterV1.post(
  "/change_password",
  requireJwtAuth,
  authController.changePassword
);
