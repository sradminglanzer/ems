import { Router } from 'express';
import { getFeePayments, createFeePayment, setSequence, updatePaymentNextDate, deleteFeePayment, sendReceiptNotification, sendDueReminders } from '../controllers/fee-payment.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', requireRole(['owner', 'admin', 'staff', 'parent']), getFeePayments);
router.post('/', requireRole(['owner', 'admin', 'staff']), createFeePayment);
router.post('/send-due-reminders', requireRole(['owner', 'admin', 'staff']), sendDueReminders);
router.post('/:id/send-receipt-notification', requireRole(['owner', 'admin', 'staff']), sendReceiptNotification);
router.patch('/:id/next-date', requireRole(['owner', 'admin', 'staff']), updatePaymentNextDate);
router.delete('/:id', requireRole(['owner', 'admin']), deleteFeePayment);
router.put('/sequence', requireRole(['owner', 'admin']), setSequence);

export default router;

