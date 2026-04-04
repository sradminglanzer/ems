import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import memberService from '../services/member.service';
import feeGroupService from '../services/fee-group.service';
import feeStructureService from '../services/fee-structure.service';
import feePaymentService from '../services/fee-payment.service';
import userService from '../services/user.service';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const academicYearId = req.query.academicYearId as string | undefined;

        if (req.user!.role === 'parent') {
            const parentUser = await userService.getOne({ _id: new ObjectId(req.user!.userId) });
            let members = await memberService.getByEntity(entityId);
            if (parentUser && parentUser.contactNumber) {
                members = members.filter(m => m.contact === parentUser.contactNumber || m.altContact === parentUser.contactNumber);
            } else {
                members = [];
            }

            // Enrich with payment stats for this academic year
            const feePayments = await feePaymentService.getByEntity(entityId, academicYearId);
            const feeGroups = await feeGroupService.getByEntity(entityId);
            const feeStructures = await feeStructureService.getByEntity(entityId);

            const groupTotalFees: Record<string, number> = {};
            feeGroups.forEach(g => {
                const groupStructures = feeStructures.filter(s => s.feeGroupId && s.feeGroupId.toString() === g._id!.toString());
                const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
                groupTotalFees[g._id!.toString()] = totalFee;
            });

            const childrenWithStats = members.map(m => {
                const mId = m._id!.toString();

                let group;
                if (academicYearId) {
                    group = feeGroups.find(g => {
                        const roster = g.yearlyRosters?.find((r: any) => r.academicYearId.toString() === academicYearId);
                        return roster && roster.members && roster.members.some((id: any) => id.toString() === mId);
                    });
                } else {
                    group = feeGroups.find(g => {
                        return g.yearlyRosters?.some((r: any) => r.members && r.members.some((id: any) => id.toString() === mId));
                    });
                }

                let totalFee = 0;
                let groupName = 'Unassigned';

                if (group) {
                    totalFee = groupTotalFees[group._id!.toString()] || 0;
                    groupName = group.name;
                }

                if (m.addonFeeIds && m.addonFeeIds.length > 0) {
                    const addonAmount = feeStructures
                        .filter(s => m.addonFeeIds!.some((id: any) => id.toString() === s._id!.toString()))
                        .reduce((sum, s) => sum + s.amount, 0);
                    totalFee += addonAmount;
                }

                const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
                const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);

                let nextPaymentDate = null;
                const paymentsByStructure: Record<string, any[]> = {};
                memberPayments.forEach(p => {
                    const structId = p.feeStructureId ? p.feeStructureId.toString() : 'general';
                    if (!paymentsByStructure[structId]) paymentsByStructure[structId] = [];
                    paymentsByStructure[structId].push(p);
                });

                const nextDates: Date[] = [];
                for (const structId in paymentsByStructure) {
                    const structPayments = paymentsByStructure[structId] || [];
                    const sortedStructPayments = structPayments.sort((a,b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
                    const latest = sortedStructPayments[0];
                    if (latest && latest.nextPaymentDate) {
                        nextDates.push(new Date(latest.nextPaymentDate));
                    }
                }
                
                if (nextDates.length > 0) {
                    // Find earliest upcoming date
                    nextPaymentDate = nextDates.sort((a,b) => a.getTime() - b.getTime())[0];
                }

                return {
                    ...m,
                    groupName,
                    totalFee,
                    totalPaid,
                    pendingAmount: totalFee - totalPaid,
                    nextPaymentDate
                };
            });

            return res.status(HTTP_STATUS.OK).json({ isParent: true, children: childrenWithStats, totalMembers: members.length });
        }

        const [members, feeGroups, feeStructures, feePayments] = await Promise.all([
            memberService.getByEntity(entityId),
            feeGroupService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId, academicYearId)
        ]);

        const groupTotalFees: Record<string, number> = {};
        feeGroups.forEach(g => {
            const groupStructures = feeStructures.filter(s => s.feeGroupId && s.feeGroupId.toString() === g._id!.toString());
            const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
            groupTotalFees[g._id!.toString()] = totalFee;
        });

        let systemTotalFees = 0;
        const expiringMembers: any[] = [];
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        members.forEach(m => {
            const mId = m._id!.toString();

            let group;
            if (academicYearId) {
                group = feeGroups.find(g => {
                    const roster = g.yearlyRosters?.find((r: any) => r.academicYearId.toString() === academicYearId);
                    return roster && roster.members && roster.members.some((id: any) => id.toString() === mId);
                });
            } else {
                group = feeGroups.find(g => {
                    return (g.members && g.members.some((id: any) => id.toString() === mId)) || 
                           (g.yearlyRosters?.some((r: any) => r.members && r.members.some((id: any) => id.toString() === mId)));
                });
            }

            if (group) {
                systemTotalFees += (groupTotalFees[group._id!.toString()] || 0);
            }

            if (m.addonFeeIds && m.addonFeeIds.length > 0) {
                const addonAmount = feeStructures
                    .filter(s => m.addonFeeIds!.some((id: any) => id.toString() === s._id!.toString()))
                    .reduce((sum, s) => sum + s.amount, 0);
                systemTotalFees += addonAmount;
            }

            // Find expiry by structure
            const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
            const paymentsByStructure: Record<string, any[]> = {};
            memberPayments.forEach(p => {
                const structId = p.feeStructureId ? p.feeStructureId.toString() : 'general';
                if (!paymentsByStructure[structId]) paymentsByStructure[structId] = [];
                paymentsByStructure[structId].push(p);
            });

            for (const structId in paymentsByStructure) {
                const structPayments = paymentsByStructure[structId] || [];
                const sortedStructPayments = structPayments.sort((a,b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
                const latestPayment = sortedStructPayments[0];
                if (latestPayment && latestPayment.nextPaymentDate) {
                    const nextDate = new Date(latestPayment.nextPaymentDate);
                    const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                    if (daysDiff <= 7 && daysDiff >= -30) {
                        // Check if member already pushed to avoid duplicates
                        if (!expiringMembers.some(em => em._id === m._id)) {
                            expiringMembers.push({
                                _id: m._id,
                                firstName: m.firstName,
                                lastName: m.lastName,
                                knownId: m.knownId,
                                contact: m.contact,
                                nextPaymentDate: nextDate
                            });
                        }
                    }
                }
            }
        });

        // Sort expiring members by date ascending
        expiringMembers.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());

        const systemTotalPaid = feePayments.reduce((sum, p) => sum + p.amount, 0);

        const todayDate = new Date();
        const pad = (n: number) => n < 10 ? '0' + n : n;
        
        const todayStr = `${todayDate.getFullYear()}-${pad(todayDate.getMonth() + 1)}-${pad(todayDate.getDate())}`;
        const thisMonthStr = `${todayDate.getFullYear()}-${pad(todayDate.getMonth() + 1)}`;
        
        const lastMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

        const collectionToday = feePayments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt || todayDate);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === todayStr;
        }).reduce((sum, p) => sum + p.amount, 0);

        const collectionThisMonth = feePayments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt || todayDate);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` === thisMonthStr;
        }).reduce((sum, p) => sum + p.amount, 0);
        
        const collectionLastMonth = feePayments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt || todayDate);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` === lastMonthStr;
        }).reduce((sum, p) => sum + p.amount, 0);

        const stats = {
            totalMembers: members.length,
            totalFeeGroups: feeGroups.length,
            totalPendingAmount: systemTotalFees - systemTotalPaid,
            totalCollectedAmount: systemTotalPaid,
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
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
