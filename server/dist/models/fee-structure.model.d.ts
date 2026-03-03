import { ObjectId } from 'mongodb';
export declare class FeeStructure {
    _id?: ObjectId;
    entityId: ObjectId;
    feeGroupId: ObjectId;
    amount: number;
    frequency: 'monthly' | 'term' | 'annual' | 'one-time';
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=fee-structure.model.d.ts.map