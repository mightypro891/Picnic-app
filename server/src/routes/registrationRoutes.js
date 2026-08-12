import { Router } from 'express';
import { createRegistration, getMyRegistration } from '../controllers/registrationController.js';
import { handleUpload } from '../middleware/upload.js';
import { registrationLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/', registrationLimiter, handleUpload, asyncHandler(createRegistration));
router.get('/:accessToken', asyncHandler(getMyRegistration));

export default router;
