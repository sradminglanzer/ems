import { Router } from 'express';
import { loginOrSetup } from '../controllers/auth.controller';
import { parentLogin, parentSetPin } from '../controllers/parent.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { loginSchema } from '../validations/user.validation';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Route for Staff / Admin Login and MPIN setup
router.post('/login', validateRequest(loginSchema), loginOrSetup);

// Routes for Parent Login and PIN management
router.post('/parent-login', parentLogin);
router.post('/parent-set-pin', parentSetPin);

export default router;
