import { ObjectId } from 'mongodb';
export interface ExamSubject {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
}
export declare class Exam {
    _id?: ObjectId;
    entityId: ObjectId;
    feeGroupId?: ObjectId;
    name: string;
    startDate: string;
    endDate: string;
    subjects: ExamSubject[];
    createdAt?: Date;
    updatedAt?: Date;
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=exam.model.d.ts.map