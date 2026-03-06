import { ObjectId } from 'mongodb';
export declare class AcademicYear {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=academic-year.model.d.ts.map