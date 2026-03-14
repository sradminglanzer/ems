import { Router } from 'express';
import { getFeeStructures, createFeeStructure, deleteFeeStructure } from '../controllers/fee-structure.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['owner', 'admin', 'staff']));

router.get('/', getFeeStructures);
router.post('/', createFeeStructure);
router.delete('/:id', deleteFeeStructure);

export default router;
