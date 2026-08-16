import { ObjectId } from 'mongodb';
import { BaseService } from './base.service';
import { Staff } from '../models/staff.model';

export class StaffService extends BaseService<Staff> {
    constructor() {
        super('staff');
    }

    async getByEntity(entityId: string): Promise<Staff[]> {
        const docs = await this.get({ entityId: new ObjectId(entityId) });
        return docs.map(d => new Staff(d));
    }
}

export default new StaffService();
