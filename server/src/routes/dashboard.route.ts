import { Router } from 'express';
import { getDashboardStats, getDashboardReports } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/stats', getDashboardStats);
router.get('/reports', getDashboardReports);

export default router;
