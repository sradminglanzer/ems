import { Member } from '../models/member.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class MemberService extends BaseService<Member> {
    constructor() {
        super('members');
    }

    async getByEntity(entityId: string): Promise<Member[]> {
        const collection = await this.getCollection();
        return collection.find({ entityId: new ObjectId(entityId) }).toArray();
    }

    /**
     * Optimized aggregation for Members List UI:
     * - Joins Room / Class name from fee_groups
     * - Joins Add-on names from fee_structures (excluding primary plan)
     * - Joins latest nextPaymentDate from fee_payments
     * - Runs entirely in MongoDB engine in a single query
     */
    async getMembersWithDetails(entityId: string, options?: { parentPhone?: string | undefined; academicYearId?: string | undefined }): Promise<any[]> {
        const collection = this.getCollection();

        const matchStage: any = { entityId: new ObjectId(entityId) };

        // Parent portal phone filter if applicable
        if (options?.parentPhone) {
            const phone = options.parentPhone;
            matchStage.$or = [
                { contact: phone },
                { fatherPhone: phone },
                { motherPhone: phone },
                { altContact: phone },
                { emergencyContactPhone: phone }
            ];
        }

        return collection.aggregate([
            { $match: matchStage },

            // 1. Join Room / Class name from fee_groups (supports direct feeGroupId, members[], and school yearlyRosters)
            {
                $lookup: {
                    from: 'fee_groups',
                    let: { memberId: '$_id', feeGrpId: '$feeGroupId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $and: [{ $ne: ['$$feeGrpId', null] }, { $eq: ['$_id', '$$feeGrpId'] }] },
                                        { $in: ['$$memberId', { $ifNull: ['$members', []] }] },
                                        {
                                            $in: [
                                                '$$memberId',
                                                {
                                                    $reduce: {
                                                        input: { $ifNull: ['$yearlyRosters.members', []] },
                                                        initialValue: [],
                                                        in: { $concatArrays: ['$$value', '$$this'] }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'groupDoc'
                }
            },

            // 2. Join Add-on names from fee_structures (excluding primary feeStructureId)
            {
                $lookup: {
                    from: 'fee_structures',
                    let: { addonIds: { $ifNull: ['$addonFeeIds', []] }, primaryId: '$feeStructureId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ['$_id', '$$addonIds'] },
                                        { $ne: ['$_id', '$$primaryId'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'addonDocs'
                }
            },

            // 3. Join only the latest payment with a nextPaymentDate
            {
                $lookup: {
                    from: 'fee_payments',
                    let: { memberId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$memberId', '$$memberId'] },
                                nextPaymentDate: { $ne: null }
                            }
                        },
                        { $sort: { paymentDate: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestPayment'
                }
            },

            // 4. Enrich fields
            {
                $addFields: {
                    groupName: { $ifNull: [{ $arrayElemAt: ['$groupDoc.name', 0] }, 'Unassigned'] },
                    addonNames: { $ifNull: ['$addonDocs.name', []] },
                    nextPaymentDate: { $ifNull: [{ $arrayElemAt: ['$latestPayment.nextPaymentDate', 0] }, null] }
                }
            },

            // 5. Clean up temporary join fields
            {
                $project: {
                    groupDoc: 0,
                    addonDocs: 0,
                    latestPayment: 0
                }
            }
        ]).toArray();
    }

    /**
     * Optimized fetch for a single Member Details:
     * - Direct match by _id and entityId
     * - Joins Room / Class name from fee_groups
     * - Joins Add-on names from fee_structures (excluding primary plan)
     * - 0 over-fetching of payments or other entities
     */
    async getMemberDetailById(id: string, entityId: string, academicYearId?: string | undefined): Promise<any | null> {
        const collection = this.getCollection();

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return null;
        }

        const results = await collection.aggregate([
            { $match: { _id: objectId, entityId: new ObjectId(entityId) } },

            // 1. Join Room / Class name from fee_groups (supports direct feeGroupId, members[], and school yearlyRosters)
            {
                $lookup: {
                    from: 'fee_groups',
                    let: { memberId: '$_id', feeGrpId: '$feeGroupId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $and: [{ $ne: ['$$feeGrpId', null] }, { $eq: ['$_id', '$$feeGrpId'] }] },
                                        { $in: ['$$memberId', { $ifNull: ['$members', []] }] },
                                        {
                                            $in: [
                                                '$$memberId',
                                                {
                                                    $reduce: {
                                                        input: { $ifNull: ['$yearlyRosters.members', []] },
                                                        initialValue: [],
                                                        in: { $concatArrays: ['$$value', '$$this'] }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'groupDoc'
                }
            },

            // 2. Join Add-on names from fee_structures (excluding primary feeStructureId)
            {
                $lookup: {
                    from: 'fee_structures',
                    let: { addonIds: { $ifNull: ['$addonFeeIds', []] }, primaryId: '$feeStructureId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ['$_id', '$$addonIds'] },
                                        { $ne: ['$_id', '$$primaryId'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'addonDocs'
                }
            },

            // 3. Enrich fields
            {
                $addFields: {
                    groupName: { $ifNull: [{ $arrayElemAt: ['$groupDoc.name', 0] }, 'Unassigned'] },
                    addonNames: { $ifNull: ['$addonDocs.name', []] }
                }
            },

            // 4. Clean up temporary join fields
            {
                $project: {
                    groupDoc: 0,
                    addonDocs: 0
                }
            }
        ]).toArray();

        return results[0] || null;
    }

    /**
     * Returns only members who are overdue (latestNextPaymentDate < today),
     * excluding members on hold / checked out / inactive.
     */
    async getOverdueMembers(entityId: string, today: Date): Promise<any[]> {
        const collection = this.getCollection();
        const members = await collection.aggregate([
            { $match: { entityId: new ObjectId(entityId), status: { $nin: ['on_hold', 'checked_out', 'inactive'] } } },
            {
                $lookup: {
                    from: 'fee_payments',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$memberId', '$$memberId'] }, nextPaymentDate: { $ne: null } } },
                        { $sort: { paymentDate: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestPayment'
                }
            },
            {
                $addFields: {
                    latestPaymentDoc: { $arrayElemAt: ['$latestPayment', 0] }
                }
            },
            {
                $match: {
                    latestPaymentDoc: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    knownId: 1,
                    contact: 1,
                    nextPaymentDate: '$latestPaymentDoc.nextPaymentDate'
                }
            }
        ]).toArray();

        return members.filter(m => {
            if (!m.nextPaymentDate) return false;
            const d = new Date(m.nextPaymentDate);
            return !isNaN(d.getTime()) && d < today;
        });
    }

    /**
     * Returns members who are overdue or have a renewal due within the next 7 days,
     * based on their most recent payment renewal date.
     */
    async getExpiringMembers(entityId: string): Promise<any[]> {
        const collection = this.getCollection();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);

        const members = await collection.aggregate([
            { $match: { entityId: new ObjectId(entityId), status: { $nin: ['on_hold', 'checked_out', 'inactive'] } } },
            {
                $lookup: {
                    from: 'fee_payments',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$memberId', '$$memberId'] }, nextPaymentDate: { $ne: null } } },
                        { $sort: { paymentDate: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestPayment'
                }
            },
            {
                $addFields: {
                    latestPaymentDoc: { $arrayElemAt: ['$latestPayment', 0] }
                }
            },
            {
                $match: {
                    latestPaymentDoc: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    knownId: 1,
                    contact: 1,
                    nextPaymentDate: '$latestPaymentDoc.nextPaymentDate'
                }
            }
        ]).toArray();

        const result = [];
        for (const m of members) {
            if (!m.nextPaymentDate) continue;
            const d = new Date(m.nextPaymentDate);
            if (isNaN(d.getTime())) continue;

            if (d <= nextWeek) {
                result.push({
                    _id: m._id,
                    firstName: m.firstName,
                    lastName: m.lastName,
                    knownId: m.knownId,
                    contact: m.contact,
                    nextPaymentDate: d,
                    isOverdue: d < today
                });
            }
        }

        return result.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    }

    /**
     * Calculates the real-time school fee ledger for a student:
     * - Finds all applicable fee structures (class-level, individual package, add-ons)
     * - Breaks down into individual installments (custom / quarters / terms / monthly)
     * - Calculates concession discounts if configured
     * - Allocates student fee payments FIFO across installments
     * - Marks installments as PAID, PARTIAL, OVERDUE, or UPCOMING
     */
    async calculateFeeLedger(memberId: string, entityId: string, academicYearId?: string): Promise<any> {
        const { getDB } = require('../config/db');
        const db = getDB();
        let mId: ObjectId;
        let eId: ObjectId;
        try {
            mId = new ObjectId(memberId);
            eId = new ObjectId(entityId);
        } catch {
            return null;
        }

        const member = await db.collection('members').findOne({ _id: mId, entityId: eId });
        if (!member) {
            return null;
        }

        // Build query for fee structures matching this student
        const feeStructConditions: any[] = [
            { entityId: eId }
        ];

        if (academicYearId && academicYearId !== 'null' && academicYearId !== 'undefined') {
            try {
                const ayId = new ObjectId(academicYearId);
                feeStructConditions.push({
                    $or: [
                        { academicYearId: ayId },
                        { academicYearId: null },
                        { academicYearId: { $exists: false } }
                    ]
                });
            } catch {
                // ignore invalid objectId
            }
        }

        // Match by feeGroupId / feeGroupIds / feeStructureId / addonFeeIds / entity-wide
        const targetGroupIds: ObjectId[] = [];
        if (member.feeGroupId) {
            targetGroupIds.push(new ObjectId(member.feeGroupId));
        }

        const explicitStructIds: ObjectId[] = [];
        if (member.feeStructureId) {
            explicitStructIds.push(new ObjectId(member.feeStructureId));
        }
        if (Array.isArray(member.addonFeeIds)) {
            member.addonFeeIds.forEach((id: any) => {
                if (id) explicitStructIds.push(new ObjectId(id));
            });
        }

        const matchApplicability: any[] = [];
        if (explicitStructIds.length > 0) {
            matchApplicability.push({ _id: { $in: explicitStructIds } });
        }
        if (targetGroupIds.length > 0) {
            matchApplicability.push({ feeGroupId: { $in: targetGroupIds } });
            matchApplicability.push({ feeGroupIds: { $in: targetGroupIds } });
        }
        // Also if entity wide
        matchApplicability.push({
            $and: [
                { feeGroupId: null },
                { $or: [{ feeGroupIds: null }, { feeGroupIds: { $size: 0 } }, { feeGroupIds: { $exists: false } }] }
            ]
        });

        const feeStructures = await db.collection('fee_structures').find({
            $and: [
                ...feeStructConditions,
                { $or: matchApplicability }
            ]
        }).toArray();

        // Fetch payments for this student
        const paymentConditions: any[] = [
            { entityId: eId, memberId: mId }
        ];
        if (academicYearId && academicYearId !== 'null' && academicYearId !== 'undefined') {
            try {
                const ayId = new ObjectId(academicYearId);
                paymentConditions.push({
                    $or: [
                        { academicYearId: ayId },
                        { academicYearId: null },
                        { academicYearId: { $exists: false } }
                    ]
                });
            } catch {
                // ignore invalid objectId
            }
        }

        const payments = await db.collection('fee_payments').find({
            $and: paymentConditions
        }).sort({ paymentDate: 1, createdAt: 1 }).toArray();

        const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

        // Collect all installment items
        const rawInstallments: any[] = [];
        let grossFee = 0;

        for (const fs of feeStructures) {
            const fsAmount = Number(fs.amount) || 0;
            if (Array.isArray(fs.installments) && fs.installments.length > 0) {
                for (const inst of fs.installments) {
                    const instAmount = Number(inst.amount) || 0;
                    grossFee += instAmount;
                    rawInstallments.push({
                        id: inst._id?.toString() || `${fs._id}_${inst.name}`,
                        feeStructureId: fs._id?.toString(),
                        feeStructureName: fs.name || 'School Fee',
                        name: inst.name || 'Installment',
                        amount: instAmount,
                        dueDate: inst.dueDate ? new Date(inst.dueDate).toISOString().split('T')[0] : null
                    });
                }
            } else if (fsAmount > 0) {
                grossFee += fsAmount;
                rawInstallments.push({
                    id: fs._id?.toString(),
                    feeStructureId: fs._id?.toString(),
                    feeStructureName: fs.name || 'School Fee',
                    name: fs.name || 'Annual Fee',
                    amount: fsAmount,
                    dueDate: fs.dueDate ? new Date(fs.dueDate).toISOString().split('T')[0] : null
                });
            }
        }

        // Apply concession if configured on member
        let concessionAmount = 0;
        const cVal = Number(member.concessionValue) || 0;
        if (cVal > 0) {
            if (member.concessionMode === 'percentage') {
                concessionAmount = Math.round((grossFee * cVal) / 100);
            } else {
                concessionAmount = Math.min(grossFee, cVal);
            }
        }

        const netPayable = Math.max(0, grossFee - concessionAmount);

        // Sort installments chronologically by dueDate (null due dates at end)
        rawInstallments.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        // Distribute concession across installments
        let remainingConcession = concessionAmount;
        const adjustedInstallments = rawInstallments.map((inst) => {
            let deducted = 0;
            if (member.concessionMode === 'percentage' && cVal > 0) {
                deducted = Math.round((inst.amount * cVal) / 100);
            } else if (remainingConcession > 0) {
                deducted = Math.min(remainingConcession, inst.amount);
                remainingConcession -= deducted;
            }
            const netAmount = Math.max(0, inst.amount - deducted);
            return {
                ...inst,
                grossAmount: inst.amount,
                concessionDeducted: deducted,
                netAmount
            };
        });

        // FIFO allocation of totalPaid
        const todayStr: string = (new Date().toISOString().split('T')[0]) || '';
        let remainingPaid = totalPaid;

        const ledgerInstallments = adjustedInstallments.map((inst) => {
            const allocated = Math.min(remainingPaid, inst.netAmount);
            const pending = Math.max(0, inst.netAmount - allocated);
            remainingPaid = Math.max(0, remainingPaid - allocated);

            let status = 'UPCOMING';
            if (pending === 0) {
                status = 'PAID';
            } else if (allocated > 0) {
                status = 'PARTIAL';
            } else if (inst.dueDate && inst.dueDate < todayStr) {
                status = 'OVERDUE';
            } else {
                status = 'UPCOMING';
            }

            return {
                id: inst.id,
                feeStructureId: inst.feeStructureId,
                feeStructureName: inst.feeStructureName,
                name: inst.name,
                grossAmount: inst.grossAmount,
                concessionDeducted: inst.concessionDeducted,
                amount: inst.netAmount,
                dueDate: inst.dueDate,
                paidAmount: allocated,
                pendingAmount: pending,
                status
            };
        });

        const totalPending = Math.max(0, netPayable - totalPaid);

        return {
            memberId: member._id?.toString(),
            studentName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            rollNo: member.rollNo || '',
            admissionNo: member.admissionNo || '',
            grossFee,
            concessionType: member.concessionType || null,
            concessionMode: member.concessionMode || null,
            concessionValue: member.concessionValue || 0,
            concessionReason: member.concessionReason || null,
            concessionAmount,
            netPayable,
            totalPaid,
            totalPending,
            installments: ledgerInstallments,
            payments: payments.map((p: any) => ({
                _id: p._id?.toString(),
                receiptNo: p.receiptNo || 'REC-' + (p._id?.toString() || '').slice(-4).toUpperCase(),
                amount: Number(p.amount) || 0,
                paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : ''),
                paymentMethod: p.paymentMethod || 'cash',
                installmentName: p.installmentName || null,
                notes: p.notes || null,
                referenceDocumentUrl: p.referenceDocumentUrl || null
            }))
        };
    }
}

export default new MemberService();
