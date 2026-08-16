import express from 'express';
import {
    getExpenses,
    getCategories,
    createExpense,
    updateExpense,
    deleteExpense,
    confirmRecurring
} from '../controllers/expense.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['owner', 'admin', 'superadmin']));

router.get('/categories', getCategories);

router.route('/')
    .get(getExpenses)
    .post(createExpense);

router.route('/:id')
    .put(updateExpense)
    .delete(deleteExpense);

router.put('/:id/confirm', confirmRecurring);

export default router;
