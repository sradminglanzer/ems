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
}

export default new MemberService();
