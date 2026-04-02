import { ObjectId } from 'mongodb';

export interface YearlyRoster {
    academicYearId: ObjectId;
    members: ObjectId[];
}

export class FeeGroup {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    description?: string;
     yearlyRosters: YearlyRoster[];
    members: ObjectId[] = []; // For non-academic tenants like Gyms
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.name = data.name;
        this.description = data.description;

        // Handle migration from old 'members' array or newly constructed 'yearlyRosters'
        this.yearlyRosters = [];
        if (Array.isArray(data.yearlyRosters)) {
            this.yearlyRosters = data.yearlyRosters.map((r: any) => ({
                academicYearId: new ObjectId(r.academicYearId),
                members: Array.isArray(r.members) ? r.members.map((id: any) => new ObjectId(id)) : []
            }));
        } else if (Array.isArray(data.members)) {
            // Legacy/Direct Mapping for non-academic tenants
            this.members = data.members.map((id: any) => new ObjectId(id));
        } else {
            this.members = [];
        }

        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.entityId && this.name);
    }
}
