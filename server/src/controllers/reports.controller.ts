import { Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AuthRequest } from '../middleware/auth.middleware';
import memberService from '../services/member.service';
import feeStructureService from '../services/fee-structure.service';
import feePaymentService from '../services/fee-payment.service';
import expenseService from '../services/expense.service';
import { HTTP_STATUS } from '../utils/constants';

function parseDateFilter(startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    const expenseDateFilter: any = {};
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        dateFilter.$or = [
            { paymentDate: { $gte: start, $lte: end } },
            { paymentDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: start, $lte: end } }
        ];

        expenseDateFilter.$or = [
            { expenseDate: { $gte: start, $lte: end } },
            { expenseDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: start, $lte: end } }
        ];
    }
    return { dateFilter, expenseDateFilter };
}

function sanitizeAcademicYearId(academicYearId?: string, entityId?: string): string | undefined {
    if (!academicYearId || academicYearId === 'null' || academicYearId === 'undefined' || academicYearId === entityId) {
        return undefined;
    }
    return academicYearId;
}

/** 1. GET /api/reports/summary — Light KPI Card Aggregation */
export const getReportSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const academicYearId = sanitizeAcademicYearId(req.query.academicYearId as string, entityId);
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        const { dateFilter, expenseDateFilter } = parseDateFilter(startDate, endDate);
        const expenseFilter: any = { entityId: new ObjectId(entityId), ...expenseDateFilter };
        if (academicYearId) expenseFilter.academicYearId = new ObjectId(academicYearId);

        const [feePayments, expenses] = await Promise.all([
            feePaymentService.getByEntity(entityId, academicYearId, dateFilter),
            expenseService.get(expenseFilter)
        ]);

        const collections = feePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

        res.status(HTTP_STATUS.OK).json({
            collections,
            expenses: totalExpenses,
            netBalance: collections - totalExpenses
        });
    } catch (error) {
        next(error);
    }
};

/** 2. GET /api/reports/payments — Paginated & Searchable Payment History */
export const getPaymentHistoryReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const academicYearId = sanitizeAcademicYearId(req.query.academicYearId as string, entityId);
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const paymentMethod = req.query.paymentMethod as string | undefined;
        const search = (req.query.search as string || '').trim().toLowerCase();
        const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit as string || '50', 10)));

        const { dateFilter } = parseDateFilter(startDate, endDate);
        if (paymentMethod && paymentMethod !== 'all') {
            dateFilter.paymentMethod = paymentMethod;
        }

        const [members, feeStructures, feePayments] = await Promise.all([
            memberService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId, academicYearId, dateFilter)
        ]);

        const memberMap = new Map<string, any>();
        members.forEach((m: any) => memberMap.set(m._id!.toString(), m));

        const structureMap = new Map<string, any>();
        feeStructures.forEach((s: any) => structureMap.set(s._id!.toString(), s));

        let paymentHistory = feePayments.map((p: any) => {
            const member = p.memberId ? memberMap.get(p.memberId.toString()) : null;
            const structure = p.feeStructureId ? structureMap.get(p.feeStructureId.toString()) : null;
            const isAddon = structure ? (structure.type === 'FeeStructureAddon' || !structure.feeGroupId) : false;

            return {
                _id: p._id!.toString(),
                receiptNo: p.receiptNo || null,
                memberName: member ? `${member.firstName} ${member.lastName}`.trim() : 'Deleted Member',
                memberId: p.memberId ? p.memberId.toString() : '',
                structureName: structure ? structure.name : 'General Fee',
                isAddon,
                amount: p.amount,
                paymentDate: p.paymentDate || p.createdAt,
                nextPaymentDate: p.nextPaymentDate || null,
                paymentMethod: p.paymentMethod || 'cash',
                notes: p.notes || null
            };
        });

        if (search) {
            paymentHistory = paymentHistory.filter(p =>
                p.memberName.toLowerCase().includes(search) ||
                p.structureName.toLowerCase().includes(search) ||
                (p.receiptNo && p.receiptNo.toLowerCase().includes(search)) ||
                (p.notes && p.notes.toLowerCase().includes(search))
            );
        }

        paymentHistory.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        const total = paymentHistory.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const startIndex = (page - 1) * limit;
        const paginatedPayments = paymentHistory.slice(startIndex, startIndex + limit);

        res.status(HTTP_STATUS.OK).json({
            payments: paginatedPayments,
            total,
            page,
            totalPages
        });
    } catch (error) {
        next(error);
    }
};

/** 3. GET /api/reports/plans-breakdown — Billing Plans & Addons Breakdown */
export const getPlansBreakdownReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const academicYearId = sanitizeAcademicYearId(req.query.academicYearId as string, entityId);
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        const { dateFilter } = parseDateFilter(startDate, endDate);

        const [members, feeStructures, feePayments] = await Promise.all([
            memberService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId, academicYearId, dateFilter)
        ]);

        const structureCollected = new Map<string, number>();
        feePayments.forEach((p: any) => {
            if (p.feeStructureId) {
                const sId = p.feeStructureId.toString();
                structureCollected.set(sId, (structureCollected.get(sId) || 0) + p.amount);
            }
        });

        const plans: any[] = [];
        const addons: any[] = [];

        feeStructures.forEach((s: any) => {
            const sId = s._id!.toString();
            const isAddon = s.type === 'FeeStructureAddon' || (!s.feeGroupId && s.type !== 'FeeStructure');

            const memberCount = members.filter((m: any) =>
                (m.feeGroupId && m.feeGroupId.toString() === s.feeGroupId?.toString()) ||
                (m.addonFeeIds || []).some((id: any) => id.toString() === sId)
            ).length;

            const item = {
                id: sId,
                name: s.name,
                frequency: s.frequency || 'monthly',
                amount: s.amount,
                isAddon: !!isAddon,
                memberCount,
                collectedAmount: structureCollected.get(sId) || 0
            };

            if (isAddon) {
                addons.push(item);
            } else {
                plans.push(item);
            }
        });

        res.status(HTTP_STATUS.OK).json({ plans, addons });
    } catch (error) {
        next(error);
    }
};

/** 4. GET /api/reports/expense-breakdown — Expenses by Category */
export const getExpenseBreakdownReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const academicYearId = sanitizeAcademicYearId(req.query.academicYearId as string, entityId);
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        const { expenseDateFilter } = parseDateFilter(startDate, endDate);
        const expenseFilter: any = { entityId: new ObjectId(entityId), ...expenseDateFilter };
        if (academicYearId) expenseFilter.academicYearId = new ObjectId(academicYearId);

        const expenses = await expenseService.get(expenseFilter);

        const expenseByCategoryMap: Record<string, number> = {};
        expenses.forEach((exp: any) => {
            const cat = exp.category || 'Miscellaneous';
            expenseByCategoryMap[cat] = (expenseByCategoryMap[cat] || 0) + exp.amount;
        });

        const topExpenses = Object.entries(expenseByCategoryMap)
            .map(([category, amount]) => ({ _id: category, total: amount }))
            .sort((a, b) => b.total - a.total);

        res.status(HTTP_STATUS.OK).json({ expenses: topExpenses });
    } catch (error) {
        next(error);
    }
};
