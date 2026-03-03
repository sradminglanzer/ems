import { Router } from 'express';
import { getFeePayments, createFeePayment } from '../controllers/fee-payment.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
// Assuming owner, admin and staff can manage fee payments
router.use(requireRole(['owner', 'admin', 'staff']));

router.get('/', getFeePayments);
router.post('/', createFeePayment);

export default router;
