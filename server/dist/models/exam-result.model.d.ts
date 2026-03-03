import { ObjectId } from 'mongodb';
export interface SubjectMark {
    subjectName: string;
    score: number;
    maxScore: number;
}
export declare class ExamResult {
    _id?: ObjectId;
    entityId: ObjectId;
    examId: ObjectId;
    memberId: ObjectId;
    marks: SubjectMark[];
    remarks?: string;
    createdAt?: Date;
    updatedAt?: Date;
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=exam-result.model.d.ts.map