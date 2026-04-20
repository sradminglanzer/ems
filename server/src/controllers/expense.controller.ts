import { Request, Response } from 'express';
import expenseService from '../services/expense.service';
import { AppError } from '../utils/AppError';
import { ObjectId } from 'mongodb';

export const getExpenses = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { academicYearId } = req.query;

        const filter: any = {};
        if (academicYearId) {
            filter.academicYearId = new ObjectId(academicYearId as string);
        }

        const expenses = await expenseService.getExpensesWithRecordingUser(entityId, filter);
        res.status(200).json(expenses);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const getExpenseStats = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { academicYearId } = req.query;

        const filter: any = { entityId: new ObjectId(entityId) };
        if (academicYearId) filter.academicYearId = new ObjectId(academicYearId as string);

        const expenses = await expenseService.get(filter);

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        res.status(200).json({ totalExpenses });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const createExpense = async (req: Request, res: Response) => {
    try {
        const { entityId, userId } = (req as any).user;
        const { amount, category, paymentMethod, expenseDate, description, academicYearId } = req.body;

        if (!amount || !category) {
            return res.status(400).json(new AppError('Amount and Category are required', 400));
        }

        const newExpense: any = {
            entityId: new ObjectId(entityId),
            amount: Number(amount),
            category,
            paymentMethod: paymentMethod || 'Cash',
            expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
            description,
            recordedBy: new ObjectId(userId),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (academicYearId) {
            newExpense.academicYearId = new ObjectId(academicYearId);
        }

        const result = await expenseService.insert(newExpense);
        
        res.status(201).json({ ...newExpense, _id: result.insertedId });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const updateExpense = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entityId } = (req as any).user;

        const updatedData = { ...req.body, updatedAt: new Date() };

        // Ensure we don't accidentally overwrite strict ObjectIds with strings
        if (updatedData.academicYearId) updatedData.academicYearId = new ObjectId(updatedData.academicYearId);
        if (updatedData.expenseDate) updatedData.expenseDate = new Date(updatedData.expenseDate);

        const success = await expenseService.update(
            { _id: new ObjectId(id), entityId: new ObjectId(entityId) },
            { $set: updatedData }
        );

        if (!success) {
            return res.status(404).json(new AppError('Expense not found or update failed', 404));
        }

        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entityId } = (req as any).user;

        const success = await expenseService.delete({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        
        if (!success) {
            return res.status(404).json(new AppError('Expense not found', 404));
        }

        res.status(200).json({ success: true, message: 'Expense deleted' });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};
