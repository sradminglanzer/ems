import { Router } from 'express';
import { getFeeGroups, createFeeGroup, updateFeeGroup, deleteFeeGroup } from '../controllers/fee-group.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
// Assuming owner, admin, staff, and teacher can view groups
router.get('/', requireRole(['owner', 'admin', 'staff', 'teacher']), getFeeGroups);

// Only owner, admin and staff can manage groups
router.post('/', requireRole(['owner', 'admin', 'staff']), createFeeGroup);
router.put('/:id', requireRole(['owner', 'admin', 'staff']), updateFeeGroup);
router.delete('/:id', requireRole(['owner', 'admin', 'staff']), deleteFeeGroup);

export default router;
