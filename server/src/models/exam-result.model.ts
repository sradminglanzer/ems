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
        const rawMarks = Array.isArray(data.marks) ? data.marks : (Array.isArray(data.subjectScores) ? data.subjectScores : []);
        this.marks = rawMarks.map((m: any) => ({
            subjectName: m.subjectName || m.subject || '',
            score: Number(m.score !== undefined ? m.score : (m.marks !== undefined ? m.marks : 0)),
            maxScore: Number(m.maxScore !== undefined ? m.maxScore : (m.maxMarks !== undefined ? m.maxMarks : 100))
        }));
        this.remarks = data.remarks;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.examId && this.memberId && this.marks);
    }
}
