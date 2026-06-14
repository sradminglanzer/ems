import express from 'express';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expense.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
// Usually expenses are managed by admins, but allowing managers too
router.use(requireRole(['owner', 'admin', 'superadmin']));

router.route('/')
    .get(getExpenses)
    .post(createExpense);

router.route('/:id')
    .delete(deleteExpense);

export default router;
