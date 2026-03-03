import { ObjectId } from 'mongodb';

export interface ExamSubject {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
}

export class Exam {
    _id?: ObjectId;
    entityId: ObjectId;
    feeGroupId?: ObjectId;
    name: string;
    startDate: string;
    endDate: string;
    subjects: ExamSubject[];
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        if (data.feeGroupId) this.feeGroupId = new ObjectId(data.feeGroupId);
        this.name = data.name;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.subjects = Array.isArray(data.subjects) ? data.subjects : [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.name && this.startDate && this.endDate && this.subjects.length > 0);
    }
}
