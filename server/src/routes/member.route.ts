import { Router } from 'express';
import { getMembers, createMember, updateMember, deleteMember } from '../controllers/member.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['owner', 'admin', 'staff']));

router.get('/', getMembers);
router.post('/', createMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
