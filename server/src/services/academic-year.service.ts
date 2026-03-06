import { ObjectId } from 'mongodb';
import { BaseService } from './base.service';
import { AcademicYear } from '../models/academic-year.model';

class AcademicYearService extends BaseService<AcademicYear> {
    constructor() {
        super('academic_years');
    }

    async getByEntity(entityId: string | ObjectId) {
        return this.get({ entityId: new ObjectId(entityId) }, { startDate: -1 }); // Newest first
    }
}

export default new AcademicYearService();
