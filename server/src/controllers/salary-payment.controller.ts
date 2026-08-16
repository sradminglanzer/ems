import { Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AuthRequest } from '../middleware/auth.middleware';
import salaryPaymentService from '../services/salary-payment.service';
import { HTTP_STATUS } from '../utils/constants';
import { AppError } from '../utils/AppError';

export const getMonthlyPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();

        const cal = new Date();
        const month = req.query.month ? Number(req.query.month) : (cal.getMonth() + 1);
        const year = req.query.year ? Number(req.query.year) : cal.getFullYear();

        const payroll = await salaryPaymentService.getMonthlyPayroll(entityId, month, year);
        res.status(HTTP_STATUS.OK).json({
            month,
            year,
            totalStaff: payroll.length,
            paidCount: payroll.filter(p => p.status === 'paid').length,
            pendingCount: payroll.filter(p => p.status === 'pending').length,
            totalDisbursed: payroll.reduce((acc, p) => acc + (p.paymentRecord?.netSalary || 0), 0),
            payroll
        });
    } catch (error) {
        next(error);
    }
};

export const processSalary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const { staffId, month, year } = req.body;

        if (!staffId || !month || !year) {
            throw new AppError('staffId, month, and year are required', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await salaryPaymentService.processSalary(entityId, req.body);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};

export const getPayslip = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const paymentId = req.params.id as string;

        if (!paymentId || !ObjectId.isValid(paymentId)) {
            throw new AppError('Valid Payment ID is required', HTTP_STATUS.BAD_REQUEST);
        }

        const payment = await salaryPaymentService.getOne({
            _id: new ObjectId(paymentId),
            entityId: new ObjectId(entityId)
        });

        if (!payment) {
            throw new AppError('Payslip record not found', HTTP_STATUS.NOT_FOUND);
        }

        res.status(HTTP_STATUS.OK).json(payment);
    } catch (error) {
        next(error);
    }
};
