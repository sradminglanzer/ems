import { ObjectId } from 'mongodb';

export class Member {
    _id?: ObjectId;
    entityId: ObjectId;
    firstName: string;
    middleName?: string;
    lastName: string;
    knownId: string;
    dob?: string;
    contact?: string;
    altContact?: string;
    fatherOccupation?: string;
    motherOccupation?: string;
    address?: string;
    feeGroupId?: ObjectId;
    addonFeeIds?: ObjectId[];
    profilePicUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);

        this.firstName = data.firstName || data.first_name;
        this.middleName = data.middleName || data.middle_name;
        this.lastName = data.lastName || data.last_name;
        this.knownId = data.knownId || data.known_id || data.rollNumber;
        this.dob = data.dob || data.dateOfBirth;
        this.contact = data.contact || data.contactNumber;
        this.altContact = data.altContact || data.alt_contact;
        this.fatherOccupation = data.fatherOccupation || data.father_occupation;
        this.motherOccupation = data.motherOccupation || data.mother_occupation;
        this.address = data.address;
        
        if (data.feeGroupId) this.feeGroupId = typeof data.feeGroupId === 'string' ? new ObjectId(data.feeGroupId) : data.feeGroupId;
        if (Array.isArray(data.addonFeeIds)) {
            this.addonFeeIds = data.addonFeeIds.map((id: any) => new ObjectId(id));
        }
        this.profilePicUrl = data.profilePicUrl;

        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.firstName && this.lastName && this.knownId && this.entityId);
    }
}
