import { ObjectId } from 'mongodb';
export declare class FeeGroup {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    description?: string;
    members: ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
    constructor(data: any);
    get valid(): boolean;
}
//# sourceMappingURL=fee-group.model.d.ts.map