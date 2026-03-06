import { Collection, Document, Filter, OptionalUnlessRequiredId, UpdateFilter, InsertOneResult, WithId } from 'mongodb';
export declare class BaseService<T extends Document> {
    protected collectionName: string;
    constructor(collectionName: string);
    protected getCollection(): Collection<T>;
    getOne(filter: Filter<T>): Promise<WithId<T> | null>;
    get(filter?: Filter<T>, options?: any): Promise<WithId<T>[]>;
    insert(doc: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T>>;
    update(filter: Filter<T>, updateData: UpdateFilter<T>): Promise<boolean>;
    delete(filter: Filter<T>): Promise<boolean>;
    updateMany(filter: Filter<T>, update: UpdateFilter<T>): Promise<boolean>;
}
//# sourceMappingURL=base.service.d.ts.map