import { FeeStructure } from '../models/fee-structure.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class FeeStructureService extends BaseService<FeeStructure> {
    constructor() {
        super('fee_structures');
    }

    async getByFeeGroup(feeGroupId: string) {
        const id = new ObjectId(feeGroupId);
        return await this.get({
            $or: [
                { feeGroupId: id },
                { feeGroupIds: id }
            ]
        } as any);
    }

    async getByEntity(entityId: string, academicYearId?: string) {
        const matchStage: any = { entityId: new ObjectId(entityId) };
        if (academicYearId) {
            matchStage.$or = [
                { academicYearId: new ObjectId(academicYearId) },
                { academicYearId: null },
                { academicYearId: { $exists: false } }
            ];
        }

        // Aggregate to include fee_group details for single or multi-class fee heads
        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'fee_groups',
                    let: { singleId: '$feeGroupId', multiIds: '$feeGroupIds' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$_id', '$$singleId'] },
                                        { $in: ['$_id', { $ifNull: ['$$multiIds', []] }] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'groupsList'
                }
            },
            {
                $addFields: {
                    groupDetails: { $arrayElemAt: ['$groupsList', 0] },
                    groupNames: {
                        $map: {
                            input: '$groupsList',
                            as: 'g',
                            in: '$$g.name'
                        }
                    }
                }
            }
        ];
        const collection = await this.getCollection();
        return await collection.aggregate(pipeline).toArray();
    }
}

export default new FeeStructureService();
