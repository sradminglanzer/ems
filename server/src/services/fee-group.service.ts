import { FeeGroup } from '../models/fee-group.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class FeeGroupService extends BaseService<FeeGroup> {
    constructor() {
        super('fee_groups');
    }

    async getByEntity(entityId: string) {
        return await this.get({ entityId: new ObjectId(entityId) });
    }
}

export default new FeeGroupService();
