import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { scanTicket, manualLookup, listGateStats } from '../controllers/checkinController.js';
import { scanLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(asyncHandler(requireAdmin));
router.post('/scan', scanLimiter, asyncHandler(scanTicket));
router.post('/manual', scanLimiter, asyncHandler(manualLookup));
router.get('/gate-stats', asyncHandler(listGateStats));

export default router;
