import { Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshAccessTokenSchema,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
} from "../../../validations";
import { AuthService } from "../../../services/auth";
import { validateApiRequest } from "../../../validations/api-request";
import { handleApiError } from "../../../utils";

const authService = new AuthService();

export class AuthController {
  public async register(req: Request, res: Response) {
    try {
      const registerPayload = validateApiRequest(registerSchema, req.body);
      const result = await authService.register(registerPayload);
      res.status(200).json(result);
    } catch (err) {
      console.error("Registration failed:", err);
      const { errMsg, httpCode } = handleApiError(err, "Registration failed");
      res.status(httpCode).json({ errMsg });
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const loginPayload = validateApiRequest(loginSchema, req.body);
      const result = await authService.login(loginPayload);
      res.status(200).json(result);
    } catch (err) {
      console.error("Login failed:", err);
      const { errMsg, httpCode } = handleApiError(err, "Login failed");
      res.status(httpCode).json({ errMsg });
    }
  }

  public async resetPassword(req: Request, res: Response) {
    try {
      const resetPasswordPayload = validateApiRequest(
        resetPasswordSchema,
        req.body
      );
      const result = await authService.resetPassword(resetPasswordPayload);
      res.status(200).json(result);
    } catch (err) {
      console.error("Reset password failed:", err);
      const { errMsg, httpCode } = handleApiError(err, "Reset password failed");
      res.status(httpCode).json({ errMsg });
    }
  }

  public async requestOtp(req: Request, res: Response) {
    try {
      const requestOtpPayload = validateApiRequest(requestOtpSchema, req.body);
      const result = await authService.requestOtp(requestOtpPayload);
      res.status(200).json(result);
    } catch (err) {
      console.error("Request otp failed:", err);
      const { errMsg, httpCode } = handleApiError(err, "Request otp failed");
      res.status(httpCode).json({ errMsg });
    }
  }

  public async changePassword(req: Request, res: Response) {
    try {
      const changePasswordPayload = validateApiRequest(
        changePasswordSchema,
        req.body
      );
      const result = await authService.changePassword(changePasswordPayload);
      res.status(200).json(result);
    } catch (err) {
      console.error("Change password failed:", err);
      const { errMsg, httpCode } = handleApiError(
        err,
        "Change password failed"
      );
      res.status(httpCode).json({ errMsg });
    }
  }

  public async refreshAccessToken(req: Request, res: Response) {
    try {
      const refreshTokenPayload = validateApiRequest(
        refreshAccessTokenSchema,
        req.body
      );

      const results = await authService.refreshAccessToken(refreshTokenPayload);
      res.status(200).json(results);
    } catch (err) {
      console.error("Refresh token failed:", err);
      const { errMsg, httpCode } = handleApiError(err, "Authentication error");
      res.status(httpCode).json({ errMsg });
    }
  }

  public async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ errMsg: "User not authenticated" });
      }
      const result = await authService.getCurrentUser({
        userId: req.user.userId,
      });
      res.status(200).json(result);
    } catch (err) {
      console.error("Get current user failed:", err);
      const { errMsg, httpCode } = handleApiError(err, "Authentication failed");
      res.status(httpCode).json({ errMsg });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      const logoutPayload = validateApiRequest(logoutSchema, req.body);

      // If no refresh token return success for frontend cleanup
      if (logoutPayload.refreshToken.length === 0) {
        res.status(200).json({ message: "Logged out successfully" });
        return;
      }

      const result = await authService.logout(logoutPayload);

      res.status(200).json(result);
    } catch (err) {
      console.error("logout failed:", err);
      const { errMsg, httpCode } = handleApiError(err, "Logout failed");
      res.status(httpCode).json({ errMsg });
    }
  }
}

// refresh token ,all
