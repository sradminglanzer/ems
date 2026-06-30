import { Router } from 'express';
import { getMembers, getMemberById, createMember, updateMember, deleteMember, holdMember, resumeMember } from '../controllers/member.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', requireRole(['owner', 'admin', 'staff', 'teacher', 'parent']), getMembers);
router.get('/:id', requireRole(['owner', 'admin', 'staff', 'teacher', 'parent']), getMemberById);
router.post('/', requireRole(['owner', 'admin', 'staff', 'teacher']), createMember);
router.put('/:id', requireRole(['owner', 'admin', 'staff', 'teacher']), updateMember);
router.put('/:id/hold', requireRole(['owner', 'admin', 'staff']), holdMember);
router.put('/:id/resume', requireRole(['owner', 'admin', 'staff']), resumeMember);
router.delete('/:id', requireRole(['owner', 'admin', 'staff']), deleteMember);

export default router;
