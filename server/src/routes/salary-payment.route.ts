import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getMonthlyPayroll, processSalary, getPayslip } from '../controllers/salary-payment.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getMonthlyPayroll);
router.post('/', processSalary);
router.get('/:id/payslip', getPayslip);

export default router;
