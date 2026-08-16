import { ObjectId } from "mongodb";
import { UserRole } from "./types";

export class User {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    contactNumber: string;
    mpin?: string; // Optional initially as they need to set it up
    expoPushToken?: string;
    role: UserRole;
    enableLogin?: boolean;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = typeof data._id === 'string' ? new ObjectId(data._id) : data._id;
        this.entityId = typeof data.entityId === 'string' ? new ObjectId(data.entityId) : data.entityId;
        this.name = data.name;
        this.contactNumber = data.contactNumber;
        this.role = data.role;
        this.mpin = data.mpin || '';
        this.expoPushToken = data.expoPushToken;
        this.enableLogin = data.enableLogin !== undefined ? Boolean(data.enableLogin) : true;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid(): boolean {
        if (!this.entityId || !this.name || !this.contactNumber || !this.role) {
            return false;
        }

        return true;
    }
}