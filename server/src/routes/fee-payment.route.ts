import { Router } from 'express';
import { getFeePayments, createFeePayment } from '../controllers/fee-payment.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', requireRole(['owner', 'admin', 'staff', 'parent']), getFeePayments);
router.post('/', requireRole(['owner', 'admin', 'staff']), createFeePayment);

export default router;
