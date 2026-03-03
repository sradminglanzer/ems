"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_service_1 = require("./base.service");
const mongodb_1 = require("mongodb");
class FeeStructureService extends base_service_1.BaseService {
    constructor() {
        super('fee_structures');
    }
    async getByFeeGroup(feeGroupId) {
        return await this.get({ feeGroupId: new mongodb_1.ObjectId(feeGroupId) });
    }
    async getByEntity(entityId) {
        // Advanced: aggregate to include fee_group details
        const pipeline = [
            { $match: { entityId: new mongodb_1.ObjectId(entityId) } },
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
exports.default = new FeeStructureService();
//# sourceMappingURL=fee-structure.service.js.map