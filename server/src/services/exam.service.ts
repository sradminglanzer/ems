import { Exam } from '../models/exam.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class ExamService extends BaseService<Exam> {
    constructor() {
        super('exams');
    }

    async getByEntity(entityId: string | ObjectId, academicYearId?: string) {
        const query: any = { entityId: new ObjectId(entityId) };
        if (academicYearId) {
            query.academicYearId = new ObjectId(academicYearId);
        }
        return this.get(query);
    }
}

export default new ExamService();
