import { ObjectId } from "mongodb";
import { UserRole } from "./types";
export declare class User {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    contactNumber: string;
    mpin?: string;
    role: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=user.model.d.ts.map