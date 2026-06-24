import { Router } from 'express';
import { getDashboardStats, getDashboardReports, getComprehensiveFinancials } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/stats', getDashboardStats);
router.get('/reports', getDashboardReports);
router.get('/comprehensive-financials', getComprehensiveFinancials);

export default router;
