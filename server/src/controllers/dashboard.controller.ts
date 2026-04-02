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
                const groupStructures = feeStructures.filter(s => s.feeGroupId.toString() === g._id!.toString());
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

                const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
                const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);

                let nextPaymentDate = null;
                const sortedPayments = memberPayments.sort((a,b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
                const latestPayment = sortedPayments[0];
                if (latestPayment && latestPayment.nextPaymentDate) {
                    nextPaymentDate = latestPayment.nextPaymentDate;
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
            const groupStructures = feeStructures.filter(s => s.feeGroupId.toString() === g._id!.toString());
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

            // Find expiry
            const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
            const sortedPayments = memberPayments.sort((a,b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
            const latestPayment = sortedPayments[0];
            if (latestPayment && latestPayment.nextPaymentDate) {
                const nextDate = new Date(latestPayment.nextPaymentDate);
                // Within 7 days (can be slightly in the past if expired recently)
                const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                if (daysDiff <= 7 && daysDiff >= -30) { // arbitrary 30 days past allowed to show in "expiring soon/expired"
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
        });

        // Sort expiring members by date ascending
        expiringMembers.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());

        const systemTotalPaid = feePayments.reduce((sum, p) => sum + p.amount, 0);

        const stats = {
            totalMembers: members.length,
            totalFeeGroups: feeGroups.length,
            totalPendingAmount: systemTotalFees - systemTotalPaid,
            totalCollectedAmount: systemTotalPaid,
            expiringMembers
        };

        res.status(HTTP_STATUS.OK).json(stats);
    } catch (error) {
        next(error);
    }
};
