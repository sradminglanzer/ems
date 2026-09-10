import { ObjectId } from 'mongodb';

export interface IDiaryTracking {
    memberId: ObjectId;
    status: 'pending' | 'completed' | 'not_done';
}

export interface IDiary {
    _id?: ObjectId;
    entityId: ObjectId;
    academicYearId?: ObjectId;
    classId: ObjectId;
    subjectId?: ObjectId;
    type: 'homework' | 'announcement' | 'reminder' | 'test';
    title: string;
    description: string;
    dueDate?: Date;
    attachments: string[];
    createdBy: ObjectId;
    studentTracking: IDiaryTracking[];
    isPublished?: boolean;
    publishedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
