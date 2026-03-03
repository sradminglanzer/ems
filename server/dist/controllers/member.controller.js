"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMember = exports.updateMember = exports.createMember = exports.getMembers = void 0;
const member_service_1 = __importDefault(require("../services/member.service"));
const member_model_1 = require("../models/member.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const fee_group_service_1 = __importDefault(require("../services/fee-group.service"));
const fee_structure_service_1 = __importDefault(require("../services/fee-structure.service"));
const fee_payment_service_1 = __importDefault(require("../services/fee-payment.service"));
const getMembers = async (req, res, next) => {
    try {
        const entityId = req.user.entityId.toString();
        const members = await member_service_1.default.getByEntity(entityId);
        const [feeGroups, feeStructures, feePayments] = await Promise.all([
            fee_group_service_1.default.getByEntity(entityId),
            fee_structure_service_1.default.getByEntity(entityId),
            fee_payment_service_1.default.getByEntity(entityId)
        ]);
        // Calculate total structural fees per group
        const groupTotalFees = {};
        feeGroups.forEach(g => {
            const groupStructures = feeStructures.filter(s => s.feeGroupId.toString() === g._id.toString());
            const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
            groupTotalFees[g._id.toString()] = totalFee;
        });
        // Enrich members with group and fee stats
        const memberStats = members.map(m => {
            const mId = m._id.toString();
            // find group
            const group = feeGroups.find(g => g.members && g.members.some((id) => id.toString() === mId));
            let totalFee = 0;
            let groupName = 'Unassigned';
            if (group) {
                totalFee = groupTotalFees[group._id.toString()] || 0;
                groupName = group.name;
            }
            // find payments
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
        res.status(constants_1.HTTP_STATUS.OK).json(memberStats);
    }
    catch (error) {
        next(error);
    }
};
exports.getMembers = getMembers;
const createMember = async (req, res, next) => {
    try {
        const member = new member_model_1.Member({ ...req.body, entityId: req.user.entityId });
        if (!member.valid) {
            throw new AppError_1.AppError('Invalid member data. First Name, Last Name and Known ID are required.', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const result = await member_service_1.default.insert(member);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createMember = createMember;
const updateMember = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { ObjectId } = require('mongodb');
        if (req.body.entityId)
            delete req.body.entityId;
        // Validation for partial update
        let updateData = { $set: {} };
        const allowedFields = ['firstName', 'middleName', 'lastName', 'knownId', 'dob', 'contact', 'altContact', 'fatherOccupation', 'motherOccupation', 'address'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData.$set[field] = req.body[field];
            }
        });
        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }
        const result = await member_service_1.default.update({ _id: new ObjectId(id), entityId: new ObjectId(req.user.entityId) }, updateData);
        res.status(constants_1.HTTP_STATUS.OK).json({ success: true });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMember = updateMember;
const deleteMember = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { ObjectId } = require('mongodb');
        const result = await member_service_1.default.delete({ _id: new ObjectId(id), entityId: new ObjectId(req.user.entityId) });
        if (result) {
            res.status(constants_1.HTTP_STATUS.OK).json({ message: 'Member deleted' });
        }
        else {
            res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMember = deleteMember;
//# sourceMappingURL=member.controller.js.map