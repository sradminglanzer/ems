import { getDB } from '../config/db';
import { Collection, Document, Filter, OptionalUnlessRequiredId, UpdateFilter, InsertOneResult, WithId } from 'mongodb';

export class BaseService<T extends Document> {
    protected collectionName: string;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
    }

    protected getCollection(): Collection<T> {
        return getDB().collection<T>(this.collectionName);
    }

    async getOne(filter: Filter<T>): Promise<WithId<T> | null> {
        return await this.getCollection().findOne(filter);
    }

    async get(filter: Filter<T> = {}, options: any = {}): Promise<WithId<T>[]> {
        // Passing options to allow projection, sorting, etc.
        return await this.getCollection().find(filter, options).toArray();
    }

    async insert(doc: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T>> {
        return await this.getCollection().insertOne(doc);
    }

    async update(filter: Filter<T>, updateData: UpdateFilter<T>): Promise<boolean> {
        const result = await this.getCollection().updateOne(filter, updateData);
        return result.modifiedCount > 0;
    }

    async delete(filter: Filter<T>): Promise<boolean> {
        const result = await this.getCollection().deleteOne(filter);
        return result.deletedCount! > 0;
    }

    async updateMany(filter: Filter<T>, update: UpdateFilter<T>): Promise<boolean> {
        const collection = await this.getCollection();
        const result = await collection.updateMany(filter, update);
        return result.modifiedCount > 0;
    }
}
