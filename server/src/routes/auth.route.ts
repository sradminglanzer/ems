import { Router } from 'express';
import { loginOrSetup, setParentPin } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { loginSchema } from '../validations/user.validation';

const router = Router();

// Unified Route for Login & MPIN / PIN setup (Auto-discovers Staff vs Parent)
router.post('/login', validateRequest(loginSchema), loginOrSetup);

// Route for Parent PIN updates
router.post('/set-pin', setParentPin);

export default router;
