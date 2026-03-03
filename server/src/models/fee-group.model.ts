import { ObjectId } from 'mongodb';

export class FeeGroup {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    description?: string;
    members: ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.name = data.name;
        this.description = data.description;
        this.members = Array.isArray(data.members) ? data.members.map((id: any) => new ObjectId(id)) : [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.name);
    }
}
