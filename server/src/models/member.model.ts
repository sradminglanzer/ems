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
    feeStructureId?: ObjectId;
    addonFeeIds?: ObjectId[];
    profilePicUrl?: string;
    joiningDate?: Date;
    status?: 'active' | 'on_hold' | 'checked_out';
    holdStartDate?: Date;
    holdHistory?: { holdDate: Date; resumeDate: Date }[];
    checkoutDetails?: {
        checkoutDate: Date;
        depositAmount: number;
        pendingDues: number;
        deductions: number;
        deductionReason?: string;
        netRefunded: number;
        refundMethod: string;
        notes?: string;
    };
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
        if (data.feeStructureId) this.feeStructureId = typeof data.feeStructureId === 'string' ? new ObjectId(data.feeStructureId) : data.feeStructureId;
        if (Array.isArray(data.addonFeeIds)) {
            this.addonFeeIds = data.addonFeeIds.map((id: any) => new ObjectId(id));
        }
        this.profilePicUrl = data.profilePicUrl;
        if (data.joiningDate) this.joiningDate = new Date(data.joiningDate);
        this.status = data.status || 'active';
        if (data.holdStartDate) this.holdStartDate = new Date(data.holdStartDate);
        if (Array.isArray(data.holdHistory)) {
            this.holdHistory = data.holdHistory.map((h: any) => ({
                holdDate: new Date(h.holdDate),
                resumeDate: new Date(h.resumeDate)
            }));
        }
        if (data.checkoutDetails) {
            this.checkoutDetails = {
                checkoutDate: new Date(data.checkoutDetails.checkoutDate || new Date()),
                depositAmount: Number(data.checkoutDetails.depositAmount) || 0,
                pendingDues: Number(data.checkoutDetails.pendingDues) || 0,
                deductions: Number(data.checkoutDetails.deductions) || 0,
                deductionReason: data.checkoutDetails.deductionReason,
                netRefunded: Number(data.checkoutDetails.netRefunded) || 0,
                refundMethod: data.checkoutDetails.refundMethod || 'cash',
                notes: data.checkoutDetails.notes
            };
        }
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.firstName && this.lastName && this.knownId && this.entityId);
    }
}
