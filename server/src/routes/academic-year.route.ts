import express from 'express';
import { getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear } from '../controllers/academic-year.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken); // Standard auth check

router.get('/', getAcademicYears);
router.post('/', requireRole(['admin', 'owner']), createAcademicYear);
router.put('/:id', requireRole(['admin', 'owner']), updateAcademicYear);
router.delete('/:id', requireRole(['admin', 'owner']), deleteAcademicYear);

export default router;
