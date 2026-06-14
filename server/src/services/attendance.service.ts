import { BaseService } from './base.service';
import { IAttendance } from '../models/attendance.model';
import { ObjectId } from 'mongodb';

class AttendanceService extends BaseService<IAttendance> {
    constructor() {
        super('attendances');
    }

    async getAttendanceWithMembers(filter: any) {
        const results = await this.getCollection().aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'members',
                    localField: 'records.memberId',
                    foreignField: '_id',
                    as: 'populatedMembers'
                }
            }
        ]).toArray();

        if (!results || results.length === 0) return null;

        const doc = results[0];
        if (!doc) return null;
        
        // Map the populated members back into the records array
        const memberMap = new Map(doc.populatedMembers.map((m: any) => [m._id.toString(), m]));
        
        doc.records = doc.records.map((r: any) => ({
            ...r,
            memberId: memberMap.get(r.memberId.toString()) || r.memberId
        }));

        delete doc.populatedMembers;
        return doc;
    }
}

export default new AttendanceService();
