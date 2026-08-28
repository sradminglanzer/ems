import { ObjectId } from 'mongodb';

export type FeeStructureType = 'FeeStructure' | 'FeeStructureAddon';

export class FeeStructure {
    _id?: ObjectId;
    entityId: ObjectId;
    academicYearId?: ObjectId; // Links to a specific academic year session (optional for gym/pg).
    feeGroupId?: ObjectId; // Links to a specific class / fee group (legacy/single).
    feeGroupIds?: ObjectId[]; // Links to multiple classes / fee groups.
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'annual' | 'one-time';
    name: string; // e.g., "Tuition Fee", "Lab Fee"
    type: FeeStructureType;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        if (data.academicYearId) this.academicYearId = new ObjectId(data.academicYearId);
        if (data.feeGroupId) this.feeGroupId = new ObjectId(data.feeGroupId);
        if (Array.isArray(data.feeGroupIds) && data.feeGroupIds.length > 0) {
            this.feeGroupIds = data.feeGroupIds.map((id: any) => new ObjectId(id));
        } else if (data.feeGroupId) {
            this.feeGroupIds = [new ObjectId(data.feeGroupId)];
        }
        this.amount = Number(data.amount);
        this.frequency = data.frequency;
        this.name = data.name;
        this.type = data.type || ((data.feeGroupId || (this.feeGroupIds && this.feeGroupIds.length > 0)) ? 'FeeStructure' : 'FeeStructureAddon');
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.amount > 0 && this.frequency && this.name && this.type);
    }
}
