import { Router } from 'express';
import { getChildDashboard } from '../controllers/parent.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/parent/student/:memberId/dashboard
router.get('/student/:memberId/dashboard', authenticateToken, getChildDashboard);

export default router;
