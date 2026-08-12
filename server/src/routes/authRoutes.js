import { Router } from 'express';
import { login, logout, me, forgotPassword, resetPassword } from '../controllers/authController.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', loginLimiter, asyncHandler(login));
router.post('/logout', asyncHandler(requireAdmin), logout);
router.get('/me', asyncHandler(requireAdmin), me);
router.post('/forgot-password', forgotPasswordLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', forgotPasswordLimiter, asyncHandler(resetPassword));

export default router;
