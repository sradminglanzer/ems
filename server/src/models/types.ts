import { ObjectId } from 'mongodb';

export interface Entity {
    _id?: ObjectId;
    name: string;
    address: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type UserRole = 'owner' | 'admin' | 'staff' | 'teacher';

export interface User {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    contactNumber: string;
    mpin?: string; // Optional initially as they need to set it up
    role: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
}
