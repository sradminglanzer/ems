import { Router } from 'express';
import { getUsers, createUser, deleteUser } from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createUserSchema } from '../validations/user.validation';

const router = Router();

// Only owners and admins can manage staff
router.use(authenticateToken);
router.use(requireRole(['owner', 'admin']));

router.get('/', getUsers);
router.post('/', validateRequest(createUserSchema), createUser);
router.delete('/:id', deleteUser);

export default router;
