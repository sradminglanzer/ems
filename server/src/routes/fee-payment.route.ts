import { Router } from 'express';
import { getFeePayments, createFeePayment, setSequence } from '../controllers/fee-payment.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', requireRole(['owner', 'admin', 'staff', 'parent']), getFeePayments);
router.post('/', requireRole(['owner', 'admin', 'staff']), createFeePayment);
router.put('/sequence', requireRole(['owner', 'admin']), setSequence);

export default router;
