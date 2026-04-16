import { ObjectId } from 'mongodb';

export class FeePayment {
    _id?: ObjectId;
    entityId: ObjectId;
    memberId: ObjectId;
    academicYearId?: ObjectId;
    feeGroupId?: ObjectId;
    feeStructureId?: ObjectId;
    amount: number;
    notes?: string;
    paymentMethod?: string;
    referenceDocumentUrl?: string;
    receiptNo?: string;
    paymentDate: Date;
    nextPaymentDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.memberId = new ObjectId(data.memberId);
        if (data.academicYearId) this.academicYearId = new ObjectId(data.academicYearId);
        if (data.feeGroupId) this.feeGroupId = new ObjectId(data.feeGroupId);
        if (data.feeStructureId) this.feeStructureId = new ObjectId(data.feeStructureId);
        this.amount = Number(data.amount);
        this.notes = data.notes;
        this.paymentMethod = data.paymentMethod || 'cash';
        this.referenceDocumentUrl = data.referenceDocumentUrl;
        if (data.receiptNo) this.receiptNo = data.receiptNo;
        this.paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
        if (data.nextPaymentDate) this.nextPaymentDate = new Date(data.nextPaymentDate);
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.memberId && this.amount != null && !isNaN(this.amount));
    }
}
