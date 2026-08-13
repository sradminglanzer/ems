import { ObjectId } from 'mongodb';

export class Staff {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    contactNumber: string;
    role: string;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.name = data.name;
        this.contactNumber = data.contactNumber;
        this.role = data.role || 'staff';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid(): boolean {
        return !!(this.entityId && this.name && this.contactNumber && this.role);
    }
}
