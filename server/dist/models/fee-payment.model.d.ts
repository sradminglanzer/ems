import { ObjectId } from 'mongodb';
export declare class FeePayment {
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
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=fee-payment.model.d.ts.map