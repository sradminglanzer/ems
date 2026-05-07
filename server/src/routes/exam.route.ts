import { Router } from 'express';
import { getExams, createExam, getResults, addResult, getMemberResults, getClassRankSheet, getMemberReportCard } from '../controllers/exam.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// accessible to parents too
router.get('/member/:memberId/results', requireRole(['owner', 'admin', 'teacher', 'parent']), getMemberResults);
router.get('/member/:memberId/report-card', requireRole(['owner', 'admin', 'teacher', 'parent']), getMemberReportCard);

// owner, admin, and teachers can manage exams
router.use(requireRole(['owner', 'admin', 'teacher']));

router.get('/', getExams);
router.post('/', createExam);

router.get('/:examId/results', getResults);
router.post('/:examId/results', addResult);
router.get('/:examId/rank-sheet', getClassRankSheet);

export default router;

