import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import memberService from '../services/member.service';
import feeGroupService from '../services/fee-group.service';
import feeStructureService from '../services/fee-structure.service';
import feePaymentService from '../services/fee-payment.service';
import expenseService from '../services/expense.service';
import { ObjectId } from 'mongodb';
import { HTTP_STATUS } from '../utils/constants';
import { getDB } from '../config/db';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const academicYearId = req.query.academicYearId as string | undefined;
        const [{ collectionToday, collectionThisMonth, collectionLastMonth }, totalMembers, totalFeeGroups, totalFeeStructures, expiringMembers] =
            await Promise.all([
                feePaymentService.getCollectionStats(entityId, academicYearId),
                memberService.count({ entityId: new ObjectId(entityId) }),
                feeGroupService.count({ entityId: new ObjectId(entityId) }),
                feeStructureService.count({ entityId: new ObjectId(entityId) }),
                memberService.getExpiringMembers(entityId),
            ]);

        const stats = {
            totalMembers,
            totalFeeGroups,
            totalFeeStructures,
            collectionToday,
            collectionThisMonth,
            collectionLastMonth,
            expiringMembers
        };

        res.status(HTTP_STATUS.OK).json(stats);
    } catch (error) {
        next(error);
    }
};

export const getDashboardReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const academicYearId = req.query.academicYearId as string | undefined;

        const [members, feeStructures, feePayments] = await Promise.all([
            memberService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId, academicYearId)
        ]);

        // 1. Enriched Payment History
        const paymentHistory = feePayments.map(p => {
            const member = members.find(m => m._id!.toString() === p.memberId.toString());
            const structure = feeStructures.find(s => s._id!.toString() === p.feeStructureId?.toString());
            return {
                _id: p._id,
                amount: p.amount,
                paymentDate: p.paymentDate || p.createdAt,
                notes: p.notes,
                memberName: member ? `${member.firstName} ${member.lastName}` : 'Deleted Member',
                memberId: p.memberId,
                structureName: structure ? structure.name : 'General Fee'
            };
        }).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        // 2. Enrollment Growth (Last 6 months)
        const enrollmentGrowth: Record<string, number> = {};
        const today = new Date();
        const pad = (n: number) => n < 10 ? '0' + n : n;

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; // YYYY-MM in Local Time
            enrollmentGrowth[monthStr] = 0;
        }

        members.forEach(m => {
            if (m.createdAt) {
                const createdDate = new Date(m.createdAt);
                const monthStr = `${createdDate.getFullYear()}-${pad(createdDate.getMonth() + 1)}`;
                if (enrollmentGrowth[monthStr] !== undefined) {
                    enrollmentGrowth[monthStr]++;
                }
            } else {
                // If no createdAt, assume current month (legacy data)
                const currentMonthStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
                if (enrollmentGrowth[currentMonthStr] !== undefined) {
                    enrollmentGrowth[currentMonthStr]++;
                }
            }
        });

        // 3. Current Month Revenue vs Last Month Revenue
        const currentMonthStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

        const currentMonthRevenue = paymentHistory
            .filter(p => {
                const d = new Date(p.paymentDate);
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` === currentMonthStr;
            })
            .reduce((sum, p) => sum + p.amount, 0);

        const lastMonthRevenue = paymentHistory
            .filter(p => {
                const d = new Date(p.paymentDate);
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` === lastMonthStr;
            })
            .reduce((sum, p) => sum + p.amount, 0);

        res.status(HTTP_STATUS.OK).json({
            paymentHistory,
            enrollmentGrowth,
            revenueComparison: {
                currentMonth: currentMonthRevenue,
                lastMonth: lastMonthRevenue,
                currentMonthLabel: currentMonthDateLabel(today),
                lastMonthLabel: currentMonthDateLabel(lastMonthDate)
            }
        });
    } catch (error) {
        next(error);
    }
};

function currentMonthDateLabel(date: Date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export const getComprehensiveFinancials = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        let academicYearId = req.query.academicYearId as string | undefined;
        if (!academicYearId || academicYearId === 'null' || academicYearId === 'undefined' || academicYearId === entityId) {
            academicYearId = undefined;
        }

        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

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

        const expenseFilter: any = { entityId: new ObjectId(entityId), ...expenseDateFilter };
        if (academicYearId) expenseFilter.academicYearId = new ObjectId(academicYearId);

        const [members, feeStructures, feePayments, expenses] = await Promise.all([
            memberService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId, academicYearId, dateFilter),
            expenseService.get(expenseFilter)
        ]);

        // Build O(1) Lookup Maps
        const memberMap = new Map<string, any>();
        members.forEach((m: any) => memberMap.set(m._id!.toString(), m));

        const structureMap = new Map<string, any>();
        feeStructures.forEach((s: any) => structureMap.set(s._id!.toString(), s));

        // 1. Detailed Payment History mapping (O(1) lookups)
        const paymentHistory = feePayments.map((p: any) => {
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
        }).sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        // 2. Aggregate collected amounts per structure in date range
        const structureCollected = new Map<string, number>();
        feePayments.forEach((p: any) => {
            if (p.feeStructureId) {
                const sId = p.feeStructureId.toString();
                structureCollected.set(sId, (structureCollected.get(sId) || 0) + p.amount);
            }
        });

        // 3. Plans and Add-ons Breakdown
        const plansBreakdown: any[] = [];
        const addonsBreakdown: any[] = [];

        feeStructures.forEach((s: any) => {
            const sId = s._id!.toString();
            const isAddon = s.type === 'FeeStructureAddon' || (!s.feeGroupId && s.type !== 'FeeStructure');

            // Count members assigned or subscribed to this structure
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
                addonsBreakdown.push(item);
            } else {
                plansBreakdown.push(item);
            }
        });

        // 4. Totals and Expenses
        const totalCollected = feePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

        const expenseByCategoryMap: Record<string, number> = {};
        expenses.forEach((exp: any) => {
            const cat = exp.category || 'Miscellaneous';
            expenseByCategoryMap[cat] = (expenseByCategoryMap[cat] || 0) + exp.amount;
        });

        const topExpenses = Object.entries(expenseByCategoryMap)
            .map(([category, amount]) => ({ _id: category, total: amount }))
            .sort((a, b) => b.total - a.total);

        res.status(HTTP_STATUS.OK).json({
            summary: {
                netBalance: totalCollected - totalExpenses,
                collections: totalCollected,
                expenses: totalExpenses
            },
            plansBreakdown,
            addonsBreakdown,
            paymentHistory,
            topExpenses
        });
    } catch (error) {
        next(error);
    }
};
