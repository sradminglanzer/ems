import { ObjectId } from 'mongodb';
export declare class Member {
    _id?: ObjectId;
    entityId: ObjectId;
    firstName: string;
    middleName?: string;
    lastName: string;
    knownId: string;
    dob?: string;
    contact?: string;
    altContact?: string;
    fatherOccupation?: string;
    motherOccupation?: string;
    address?: string;
    createdAt?: Date;
    updatedAt?: Date;
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=member.model.d.ts.map