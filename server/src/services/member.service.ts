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

            // 1. Join Room / Class name from fee_groups
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
                                        { $in: ['$$memberId', { $ifNull: ['$members', []] }] }
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

            // 1. Join Room / Class name from fee_groups
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
                                        { $in: ['$$memberId', { $ifNull: ['$members', []] }] }
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
}

export default new MemberService();
