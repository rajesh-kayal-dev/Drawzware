import type { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refreshSessionTokens,
  logoutSession,
  logoutAllSessions,
  getUserProfile,
  updateUserProfile,
} from '../services/auth.service.js';
import { serverError } from '../middleware/error-handler.js';

export const registerHandler = async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return res.status(201).json({
      message: result.emailDelivery === 'failed'
        ? 'User registered successfully. Verification email could not be sent right now.'
        : 'User registered successfully. Please verify your email.',
      user: result.user,
      tokens: result.tokens,
      token: result.tokens.accessToken, // Backward compatibility
      emailDelivery: result.emailDelivery,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Email already registered') {
      return res.status(409).json({ error: 'CONFLICT', message: 'Email already registered.' });
    }
    return serverError(res, 'Failed to register user.', err);
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return res.json({
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens,
      token: result.tokens.accessToken, // Backward compatibility
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password.' });
    }
    return serverError(res, 'Failed to log in.', err);
  }
};

export const verifyEmailHandler = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const result = await verifyEmail(token, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return res.json({
      ...result,
      tokens: result.tokens,
      token: result.tokens?.accessToken,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_OR_EXPIRED_VERIFICATION_TOKEN') {
      return res.status(400).json({
        error: 'INVALID_TOKEN',
        message: 'Email verification token is invalid or has expired.',
      });
    }
    return serverError(res, 'Failed to verify email address.', err);
  }
};

export const resendVerificationHandler = async (req: Request, res: Response) => {
  try {
    const { email, returnUrl } = req.body;
    const result = await resendVerification(email, returnUrl);
    return res.json(result);
  } catch (err: unknown) {
    return serverError(res, 'Failed to process verification request.', err);
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { email, returnUrl } = req.body;
    const result = await forgotPassword(email, returnUrl);
    return res.json(result);
  } catch (err: unknown) {
    return serverError(res, 'Failed to process password reset request.', err);
  }
};

export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const result = await resetPassword(token, newPassword);
    return res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_OR_EXPIRED_RESET_TOKEN') {
      return res.status(400).json({
        error: 'INVALID_TOKEN',
        message: 'Password reset token is invalid or has expired.',
      });
    }
    return serverError(res, 'Failed to reset password.', err);
  }
};

export const refreshHandler = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await refreshSessionTokens(refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return res.json({
      message: 'Tokens refreshed successfully',
      tokens,
      token: tokens.accessToken, // Backward compatibility
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'TOKEN_REUSE_DETECTED') {
        return res.status(401).json({
          error: 'TOKEN_REUSE_DETECTED',
          message: 'Refresh token reuse detected. All sessions in this family have been revoked.',
        });
      }
      if (err.message === 'INVALID_REFRESH_TOKEN') {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Refresh token is invalid or has expired.',
        });
      }
      if (err.message === 'CONCURRENT_REFRESH_CONFLICT') {
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'Concurrent refresh conflict detected. Please retry with the latest token.',
        });
      }
    }
    return serverError(res, 'Failed to refresh token.', err);
  }
};

export const logoutHandler = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body || {};
    const result = await logoutSession(refreshToken);
    return res.json(result);
  } catch (err: unknown) {
    return serverError(res, 'Failed to log out.', err);
  }
};

export const logoutAllHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    const result = await logoutAllSessions(userId);
    return res.json(result);
  } catch (err: unknown) {
    return serverError(res, 'Failed to log out from all devices.', err);
  }
};

export const getMeHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    const user = await getUserProfile(userId);
    return res.json({ user });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    }
    return serverError(res, 'Failed to fetch user profile.', err);
  }
};

export const updateProfileHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    const { name } = req.body || {};
    const user = await updateUserProfile(userId, { name });
    return res.json({ user, message: 'Profile updated successfully.' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    }
    return serverError(res, err instanceof Error ? err.message : 'Failed to update profile.', err);
  }
};
