import { Exam } from '../models/exam.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class ExamService extends BaseService<Exam> {
    constructor() {
        super('exams');
    }

    async getByEntity(entityId: string) {
        return await this.get({ entityId: new ObjectId(entityId) });
    }
}

export default new ExamService();
