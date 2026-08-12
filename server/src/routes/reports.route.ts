import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
    getReportSummary,
    getPaymentHistoryReport,
    getPlansBreakdownReport,
    getExpenseBreakdownReport
} from '../controllers/reports.controller';

const router = Router();

router.use(authenticateToken);

router.get('/summary', getReportSummary);
router.get('/payments', getPaymentHistoryReport);
router.get('/plans-breakdown', getPlansBreakdownReport);
router.get('/expense-breakdown', getExpenseBreakdownReport);

export default router;
