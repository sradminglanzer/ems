import { BaseService } from './base.service';
import { ISubject } from '../models/subject.model';

class SubjectService extends BaseService<ISubject> {
    constructor() {
        super('subjects');
    }
}

export default new SubjectService();
