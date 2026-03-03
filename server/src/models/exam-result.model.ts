import { ObjectId } from 'mongodb';

export interface SubjectMark {
    subjectName: string;
    score: number;
    maxScore: number;
}

export class ExamResult {
    _id?: ObjectId;
    entityId: ObjectId;
    examId: ObjectId;
    memberId: ObjectId;
    marks: SubjectMark[];
    remarks?: string;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.examId = new ObjectId(data.examId);
        this.memberId = new ObjectId(data.memberId);
        this.marks = Array.isArray(data.marks) ? data.marks.map((m: any) => ({
            subjectName: m.subjectName,
            score: Number(m.score),
            maxScore: Number(m.maxScore)
        })) : [];
        this.remarks = data.remarks;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.examId && this.memberId && this.marks);
    }
}
