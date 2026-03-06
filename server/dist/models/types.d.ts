import { ObjectId } from 'mongodb';
export interface Entity {
    _id?: ObjectId;
    name: string;
    address: string;
    createdAt?: Date;
    updatedAt?: Date;
    settings?: {
        feeGroupLabel?: string;
        memberLabel?: string;
    };
}
export type UserRole = 'owner' | 'admin' | 'staff' | 'teacher' | 'parent';
export interface User {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    contactNumber: string;
    mpin?: string;
    role: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
}
//# sourceMappingURL=types.d.ts.map