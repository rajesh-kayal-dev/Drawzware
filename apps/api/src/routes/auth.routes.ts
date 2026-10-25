import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';
import { requireAuth } from '../middleware/auth.js';
import {
  registerHandler,
  loginHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
  getMeHandler,
} from '../controllers/auth.controller.js';
import {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  ResendVerificationInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  RefreshTokenInputSchema,
} from '../validators/auth.validator.js';

export {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  ResendVerificationInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  RefreshTokenInputSchema,
};

const router = Router();

// Account creation and login (rate-limited)
router.post('/register', authRateLimiter, validateBody(RegisterInputSchema), registerHandler);
router.post('/signup', authRateLimiter, validateBody(RegisterInputSchema), registerHandler);
router.post('/login', authRateLimiter, validateBody(LoginInputSchema), loginHandler);

// Email verification and password recovery (rate-limited)
router.post('/verify-email', authRateLimiter, validateBody(VerifyEmailInputSchema), verifyEmailHandler);
router.post('/resend-verification', authRateLimiter, validateBody(ResendVerificationInputSchema), resendVerificationHandler);
router.post('/forgot-password', authRateLimiter, validateBody(ForgotPasswordInputSchema), forgotPasswordHandler);
router.post('/reset-password', authRateLimiter, validateBody(ResetPasswordInputSchema), resetPasswordHandler);

// Session management & Token rotation (rate-limited)
router.post('/refresh', authRateLimiter, validateBody(RefreshTokenInputSchema), refreshHandler);
router.post('/logout', logoutHandler);
router.post('/logout-all', requireAuth, logoutAllHandler);

// Current user profile
router.get('/me', requireAuth, getMeHandler);

export const authRoutes: Router = router;
export default router;
