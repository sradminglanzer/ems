import { Router } from 'express';
import { getExams, createExam, getResults, addResult, getMemberResults } from '../controllers/exam.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// public to parent for specific member
router.get('/member/:memberId/results', requireRole(['owner', 'admin', 'teacher', 'parent']), getMemberResults);

// owner, admin, and teachers can manage exams
router.use(requireRole(['owner', 'admin', 'teacher']));

router.get('/', getExams);
router.post('/', createExam);

router.get('/:examId/results', getResults);
router.post('/:examId/results', addResult);

export default router;
