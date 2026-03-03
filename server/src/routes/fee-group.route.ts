import { Router } from 'express';
import { getFeeGroups, createFeeGroup, updateFeeGroup, deleteFeeGroup } from '../controllers/fee-group.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
// Assuming owner, admin and staff can manage groups
router.use(requireRole(['owner', 'admin', 'staff']));

router.get('/', getFeeGroups);
router.post('/', createFeeGroup);
router.put('/:id', updateFeeGroup);
router.delete('/:id', deleteFeeGroup);

export default router;
