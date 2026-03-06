import { ObjectId } from 'mongodb';

export class FeePayment {
    _id?: ObjectId;
    entityId: ObjectId;
    memberId: ObjectId;
    academicYearId?: ObjectId;
    feeGroupId?: ObjectId;
    amount: number;
    notes?: string;
    paymentDate: Date;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.memberId = new ObjectId(data.memberId);
        if (data.academicYearId) this.academicYearId = new ObjectId(data.academicYearId);
        if (data.feeGroupId) this.feeGroupId = new ObjectId(data.feeGroupId);
        this.amount = Number(data.amount);
        this.notes = data.notes;
        this.paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.memberId && this.amount != null && !isNaN(this.amount));
    }
}
