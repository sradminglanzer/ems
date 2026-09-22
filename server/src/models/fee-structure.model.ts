import { ObjectId } from 'mongodb';

export type FeeStructureType = 'FeeStructure' | 'FeeStructureAddon';

export interface FeeInstallment {
    _id?: ObjectId;
    name: string;
    amount: number;
    dueDate?: string; // ISO date string e.g. "2025-04-10"
}

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
    installments?: FeeInstallment[];
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

        if (Array.isArray(data.installments) && data.installments.length > 0) {
            const mappedInstallments: FeeInstallment[] = data.installments.map((inst: any) => ({
                _id: inst._id ? new ObjectId(inst._id) : new ObjectId(),
                name: inst.name || 'Installment',
                amount: Number(inst.amount) || 0,
                dueDate: inst.dueDate || undefined
            }));
            this.installments = mappedInstallments;
            const installmentTotal = mappedInstallments.reduce((sum, i) => sum + i.amount, 0);
            this.amount = installmentTotal > 0 ? installmentTotal : Number(data.amount);
        } else {
            this.amount = Number(data.amount);
        }

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
