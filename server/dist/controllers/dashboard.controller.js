"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const member_service_1 = __importDefault(require("../services/member.service"));
const fee_group_service_1 = __importDefault(require("../services/fee-group.service"));
const fee_structure_service_1 = __importDefault(require("../services/fee-structure.service"));
const fee_payment_service_1 = __importDefault(require("../services/fee-payment.service"));
const user_service_1 = __importDefault(require("../services/user.service"));
const constants_1 = require("../utils/constants");
const mongodb_1 = require("mongodb");
const getDashboardStats = async (req, res, next) => {
    try {
        const entityId = req.user.entityId.toString();
        const academicYearId = req.query.academicYearId;
        if (req.user.role === 'parent') {
            const parentUser = await user_service_1.default.getOne({ _id: new mongodb_1.ObjectId(req.user.userId) });
            let members = await member_service_1.default.getByEntity(entityId);
            if (parentUser && parentUser.contactNumber) {
                members = members.filter(m => m.contact === parentUser.contactNumber || m.altContact === parentUser.contactNumber);
            }
            else {
                members = [];
            }
            // Enrich with payment stats for this academic year
            const feePayments = await fee_payment_service_1.default.getByEntity(entityId, academicYearId);
            const feeGroups = await fee_group_service_1.default.getByEntity(entityId);
            const feeStructures = await fee_structure_service_1.default.getByEntity(entityId);
            const groupTotalFees = {};
            feeGroups.forEach(g => {
                const groupStructures = feeStructures.filter(s => s.feeGroupId.toString() === g._id.toString());
                const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
                groupTotalFees[g._id.toString()] = totalFee;
            });
            const childrenWithStats = members.map(m => {
                const mId = m._id.toString();
                const group = feeGroups.find(g => g.members && g.members.some((id) => id.toString() === mId));
                let totalFee = 0;
                let groupName = 'Unassigned';
                if (group) {
                    totalFee = groupTotalFees[group._id.toString()] || 0;
                    groupName = group.name;
                }
                const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
                const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);
                return {
                    ...m,
                    groupName,
                    totalFee,
                    totalPaid,
                    pendingAmount: totalFee - totalPaid
                };
            });
            return res.status(constants_1.HTTP_STATUS.OK).json({ isParent: true, children: childrenWithStats, totalMembers: members.length });
        }
        const [members, feeGroups, feeStructures, feePayments] = await Promise.all([
            member_service_1.default.getByEntity(entityId),
            fee_group_service_1.default.getByEntity(entityId),
            fee_structure_service_1.default.getByEntity(entityId),
            fee_payment_service_1.default.getByEntity(entityId, academicYearId)
        ]);
        const groupTotalFees = {};
        feeGroups.forEach(g => {
            const groupStructures = feeStructures.filter(s => s.feeGroupId.toString() === g._id.toString());
            const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
            groupTotalFees[g._id.toString()] = totalFee;
        });
        let systemTotalFees = 0;
        members.forEach(m => {
            const mId = m._id.toString();
            const group = feeGroups.find(g => g.members && g.members.some((id) => id.toString() === mId));
            if (group) {
                systemTotalFees += (groupTotalFees[group._id.toString()] || 0);
            }
        });
        const systemTotalPaid = feePayments.reduce((sum, p) => sum + p.amount, 0);
        const stats = {
            totalMembers: members.length,
            totalFeeGroups: feeGroups.length,
            totalPendingAmount: systemTotalFees - systemTotalPaid,
            totalCollectedAmount: systemTotalPaid
        };
        res.status(constants_1.HTTP_STATUS.OK).json(stats);
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=dashboard.controller.js.map