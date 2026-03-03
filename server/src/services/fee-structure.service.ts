import { FeeStructure } from '../models/fee-structure.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class FeeStructureService extends BaseService<FeeStructure> {
    constructor() {
        super('fee_structures');
    }

    async getByFeeGroup(feeGroupId: string) {
        return await this.get({ feeGroupId: new ObjectId(feeGroupId) });
    }

    async getByEntity(entityId: string) {
        // Advanced: aggregate to include fee_group details
        const pipeline = [
            { $match: { entityId: new ObjectId(entityId) } },
            {
                $lookup: {
                    from: 'fee_groups',
                    localField: 'feeGroupId',
                    foreignField: '_id',
                    as: 'groupDetails'
                }
            },
            {
                $unwind: {
                    path: '$groupDetails',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];
        const collection = await this.getCollection();
        return await collection.aggregate(pipeline).toArray();
    }
}

export default new FeeStructureService();
