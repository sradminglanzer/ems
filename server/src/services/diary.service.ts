import { BaseService } from './base.service';
import { IDiary } from '../models/diary.model';

class DiaryService extends BaseService<IDiary> {
    constructor() {
        super('diaries');
    }

    async getDiariesPopulated(filter: any) {
        return await this.getCollection().aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subjectId',
                    foreignField: '_id',
                    as: 'subjectId'
                }
            },
            { $unwind: { path: '$subjectId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdBy'
                }
            },
            { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'members',
                    localField: 'studentTracking.memberId',
                    foreignField: '_id',
                    as: 'populatedMembers'
                }
            },
            {
                 $project: {
                      'createdBy.password': 0,
                      'createdBy.mPin': 0
                 }
            }
        ]).toArray();
    }
}

export default new DiaryService();
