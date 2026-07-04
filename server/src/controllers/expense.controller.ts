import { Request, Response, NextFunction } from 'express';
import expenseService, { computeNextRecurringDate } from '../services/expense.service';
import { EXPENSE_CATEGORIES } from '../models/expense.model';
import { AppError } from '../utils/AppError';
import { ObjectId } from 'mongodb';
import { HTTP_STATUS } from '../utils/constants';

const getUser = (req: Request) => (req as any).user;

// GET /api/expenses
// Query: startDate, endDate, category, paymentMethod
export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { entityId } = getUser(req);
        const { startDate, endDate, category, paymentMethod, year, month } = req.query;

        const opts: any = {};
        if (startDate) opts.startDate = new Date(startDate as string);
        if (endDate) opts.endDate = new Date(endDate as string);
        if (category) opts.category = category as string;
        if (paymentMethod) opts.paymentMethod = paymentMethod as string;

        const [expenses, summary] = await Promise.all([
            expenseService.getFilteredExpenses(String(entityId), opts),
            year && month
                ? expenseService.getMonthlySummary(String(entityId), Number(year), Number(month))
                : Promise.resolve([])
        ]);

        res.status(HTTP_STATUS.OK).json({ expenses, summary });
    } catch (error) {
        next(error);
    }
};

// GET /api/expenses/categories
export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(HTTP_STATUS.OK).json(EXPENSE_CATEGORIES);
    } catch (error) {
        next(error);
    }
};

// POST /api/expenses
export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { entityId, userId } = getUser(req);
        const {
            title, category, amount, expenseDate, paymentMethod,
            vendor, notes, receiptUrl, isRecurring, recurringFrequency
        } = req.body;

        if (!title || !category || !amount) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new AppError('Title, Category and Amount are required', 400));
        }

        const dateOfExpense = expenseDate ? new Date(expenseDate) : new Date();

        // Compute first next recurring date
        let recurringNextDate: Date | undefined;
        if (isRecurring && recurringFrequency) {
            recurringNextDate = computeNextRecurringDate(dateOfExpense, recurringFrequency);
        }

        const newExpense: any = {
            entityId: new ObjectId(String(entityId)),
            title,
            category,
            amount: Number(amount),
            expenseDate: dateOfExpense,
            paymentMethod: paymentMethod || 'cash',
            vendor: vendor || undefined,
            notes: notes || undefined,
            receiptUrl: receiptUrl || undefined,
            status: 'confirmed',
            isRecurring: Boolean(isRecurring),
            recurringFrequency: isRecurring ? recurringFrequency : undefined,
            recurringNextDate,
            recordedBy: new ObjectId(String(userId)),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await expenseService.insert(newExpense);
        res.status(HTTP_STATUS.CREATED).json({ ...newExpense, _id: result.insertedId });
    } catch (error) {
        next(error);
    }
};

// PUT /api/expenses/:id
export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { entityId } = getUser(req);

        const updates: any = { ...req.body, updatedAt: new Date() };
        if (updates.expenseDate) updates.expenseDate = new Date(updates.expenseDate);
        if (updates.recurringNextDate) updates.recurringNextDate = new Date(updates.recurringNextDate);
        // Prevent overwriting ObjectId fields with strings
        delete updates.entityId;
        delete updates.recordedBy;
        delete updates.recurringParentId;

        const success = await expenseService.update(
            { _id: new ObjectId(id), entityId: new ObjectId(String(entityId)) },
            { $set: updates }
        );

        if (!success) return res.status(HTTP_STATUS.NOT_FOUND).json(new AppError('Expense not found', 404));
        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/expenses/:id
export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { entityId } = getUser(req);

        const success = await expenseService.delete({
            _id: new ObjectId(id),
            entityId: new ObjectId(String(entityId))
        });

        if (!success) return res.status(HTTP_STATUS.NOT_FOUND).json(new AppError('Expense not found', 404));
        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Expense deleted' });
    } catch (error) {
        next(error);
    }
};

// PUT /api/expenses/:id/confirm  — confirm a pending_confirmation recurring draft
export const confirmRecurring = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { entityId } = getUser(req);
        const { amount } = req.body; // Admin can adjust amount at confirm time

        const expense = await expenseService.getOne({
            _id: new ObjectId(id),
            entityId: new ObjectId(String(entityId)),
            status: 'pending_confirmation'
        });

        if (!expense) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new AppError('Pending expense not found', 404));
        }

        // Confirm the draft
        await expenseService.update(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: 'confirmed',
                    amount: amount !== undefined ? Number(amount) : expense.amount,
                    updatedAt: new Date()
                }
            }
        );

        // Advance recurringNextDate on the parent expense
        if (expense.recurringParentId && expense.recurringFrequency) {
            const nextDate = computeNextRecurringDate(
                expense.expenseDate,
                expense.recurringFrequency
            );
            await expenseService.update(
                { _id: expense.recurringParentId },
                { $set: { recurringNextDate: nextDate, updatedAt: new Date() } }
            );
        }

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Expense confirmed' });
    } catch (error) {
        next(error);
    }
};
