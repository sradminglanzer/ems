import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getStaff, createStaff, updateStaff, deleteStaff, toggleStaffLogin } from '../controllers/staff.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.patch('/:id/toggle-login', toggleStaffLogin);

export default router;
