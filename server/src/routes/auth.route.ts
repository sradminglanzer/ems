import { Router } from 'express';
import { loginOrSetup } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { loginSchema } from '../validations/user.validation';

const router = Router();

// Route for Login and MPIN setup
router.post('/login', validateRequest(loginSchema), loginOrSetup);

export default router;
