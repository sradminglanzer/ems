import { Router } from 'express';
import { getUsers, createUser, deleteUser, updatePushToken } from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createUserSchema } from '../validations/user.validation';

const router = Router();

// Allow any authenticated user to save their push token
router.post('/push-token', authenticateToken, updatePushToken);

// Only owners and admins can manage staff
router.use(authenticateToken);
router.use(requireRole(['owner', 'admin']));

router.get('/', getUsers);
router.post('/', validateRequest(createUserSchema), createUser);
router.delete('/:id', deleteUser);

export default router;
