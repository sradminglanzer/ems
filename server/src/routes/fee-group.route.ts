import { Router } from 'express';
import { getFeeGroups, getFeeGroupDetails, createFeeGroup, updateFeeGroup, deleteFeeGroup, addMemberToGroup } from '../controllers/fee-group.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
// Assuming owner, admin, staff, and teacher can view groups
router.get('/', requireRole(['owner', 'admin', 'staff', 'teacher']), getFeeGroups);
router.get('/:id/details', requireRole(['owner', 'admin', 'staff', 'teacher']), getFeeGroupDetails);

// Only owner, admin and staff can manage groups
router.post('/', requireRole(['owner', 'admin', 'staff']), createFeeGroup);
router.post('/:id/members', requireRole(['owner', 'admin', 'staff', 'teacher']), addMemberToGroup);
router.put('/:id', requireRole(['owner', 'admin', 'staff', 'teacher']), updateFeeGroup);
router.delete('/:id', requireRole(['owner', 'admin', 'staff']), deleteFeeGroup);

export default router;
