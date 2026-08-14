import { ObjectId } from 'mongodb';

export interface BankDetails {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
}

export interface EmergencyContact {
    name?: string;
    phone?: string;
    relation?: string;
}

export class Staff {
    _id?: ObjectId;
    entityId: ObjectId;
    name: string;
    contactNumber: string;
    role: string;
    email?: string;
    designation?: string;
    qualifications: string[];
    monthlySalary?: number;
    salaryType: 'monthly' | 'hourly' | 'commission';
    joiningDate?: string;
    employmentType: 'full-time' | 'part-time' | 'contract';
    status: 'active' | 'inactive' | 'on-leave';
    address?: string;
    bankDetails?: BankDetails;
    emergencyContact?: EmergencyContact;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.name = data.name;
        this.contactNumber = data.contactNumber;
        this.role = data.role || 'staff';
        this.email = data.email || undefined;
        this.designation = data.designation || undefined;
        this.qualifications = Array.isArray(data.qualifications) ? data.qualifications : [];
        this.monthlySalary = data.monthlySalary != null ? Number(data.monthlySalary) : undefined;
        this.salaryType = data.salaryType || 'monthly';
        this.joiningDate = data.joiningDate || undefined;
        this.employmentType = data.employmentType || 'full-time';
        this.status = data.status || 'active';
        this.address = data.address || undefined;
        this.bankDetails = data.bankDetails || undefined;
        this.emergencyContact = data.emergencyContact || undefined;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid(): boolean {
        return !!(this.entityId && this.name && this.contactNumber && this.role);
    }
}
