import { ObjectId } from 'mongodb';

export class AcademicYear {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    startDate: string; // ISO String (YYYY-MM-DD)
    endDate: string; // ISO String (YYYY-MM-DD)
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.name = data.name;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.isActive = !!data.isActive;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.name && this.startDate && this.endDate);
    }
}
