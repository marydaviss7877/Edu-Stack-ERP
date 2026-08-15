import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  loginValidators,
  logout,
  refresh,
  getMe,
  changePassword,
  changePasswordValidators,
  forceChangePassword,
  forceChangePasswordValidators,
  registerOrg,
  registerOrgValidators,
  verifyEmail,
  verifyEmailValidators,
  resendVerification,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth/authenticate';
import { asyncHandler } from '../utils/asyncHandler';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registrations from this IP.' },
});

const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

// Per-code attempts are also capped (VERIFICATION_MAX_ATTEMPTS); this is an outer brute-force guard.
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many code requests. Please try again later.' },
});

const router = Router();

router.post('/login', loginLimiter, loginValidators, asyncHandler(login));
router.post('/force-change-password', loginLimiter, forceChangePasswordValidators, asyncHandler(forceChangePassword));
router.post('/register', registerLimiter, registerOrgValidators, asyncHandler(registerOrg));
router.post('/refresh', refreshLimiter, asyncHandler(refresh));
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(getMe));
router.put('/change-password', authenticate, changePasswordValidators, asyncHandler(changePassword));
router.post('/verify-email', authenticate, verifyEmailLimiter, verifyEmailValidators, asyncHandler(verifyEmail));
router.post('/resend-verification', authenticate, resendVerificationLimiter, asyncHandler(resendVerification));

export default router;
