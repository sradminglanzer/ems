import { ObjectId } from 'mongodb';

export class FeeStructure {
    _id?: ObjectId;
    entityId: ObjectId;
    feeGroupId: ObjectId; // Links to a specific class / fee group
    amount: number;
    frequency: 'monthly' | 'term' | 'annual' | 'one-time';
    name: string; // e.g., "Tuition Fee", "Lab Fee"
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.feeGroupId = new ObjectId(data.feeGroupId);
        this.amount = Number(data.amount);
        this.frequency = data.frequency;
        this.name = data.name;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.feeGroupId && this.amount > 0 && this.frequency && this.name);
    }
}
