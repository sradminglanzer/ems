import { ObjectId } from 'mongodb';

export interface ISubject {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    code?: string;
    assignedClasses: ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}
