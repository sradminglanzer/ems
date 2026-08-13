import { ObjectId } from 'mongodb';

export interface StaffRoleSetting {
    label: string;
    code: string;
    enable_login: boolean;
}

export const DEFAULT_GYM_STAFF_ROLES: StaffRoleSetting[] = [
    { label: 'Admin', code: 'admin', enable_login: true },
    { label: 'Staff', code: 'staff', enable_login: false }
];

export class EntitySettings {
    _id?: ObjectId;
    entityId: ObjectId;
    staffRoles: StaffRoleSetting[];
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.staffRoles = Array.isArray(data.staffRoles) && data.staffRoles.length > 0
            ? data.staffRoles
            : DEFAULT_GYM_STAFF_ROLES;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
}
