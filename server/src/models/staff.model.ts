import { ObjectId } from 'mongodb';

export interface EmergencyContact {
    name?: string | undefined;
    phone?: string | undefined;
    relation?: string | undefined;
}

export interface StaffSubjectAllocation {
    feeGroupId: ObjectId;
    feeGroupName?: string | undefined;
    subjectName: string;
}

export class Staff {
    _id?: ObjectId | undefined;
    entityId: ObjectId;
    employeeId?: string | undefined;
    name: string;
    contactNumber: string;
    role: string; // 'teacher' | 'admin' | 'accountant' | 'librarian' | 'driver' | 'peon' | 'security' | 'other'
    email?: string | undefined;
    gender?: string | undefined; // 'male' | 'female' | 'other'
    dob?: string | undefined;
    designation?: string | undefined;
    qualifications: string[];
    specializationSubjects: string[];
    experienceYears?: number | undefined;
    panNumber?: string | undefined;
    aadhaarNumber?: string | undefined;

    // School Workload Allocations
    assignedClassTeacherGroupId?: ObjectId | undefined; // If assigned as Class Teacher for a class/section
    assignedSubjects: StaffSubjectAllocation[]; // Subjects taught across classes

    // Compensation (No bank details required)
    monthlySalary?: number | undefined; // Base Salary
    hra?: number | undefined;
    allowances?: number | undefined;
    pfDeduction?: number | undefined;
    taxDeduction?: number | undefined;
    salaryType: 'monthly' | 'hourly' | 'commission';
    joiningDate?: string | undefined;
    employmentType: 'full-time' | 'part-time' | 'contract';
    status: 'active' | 'inactive' | 'on-leave';
    address?: string | undefined;
    emergencyContact?: EmergencyContact | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        if (data.employeeId) this.employeeId = data.employeeId;
        this.name = data.name;
        this.contactNumber = data.contactNumber;
        this.role = data.role || 'staff';
        if (data.email) this.email = data.email;
        if (data.gender) this.gender = data.gender;
        if (data.dob) this.dob = data.dob;
        if (data.designation) this.designation = data.designation;
        this.qualifications = Array.isArray(data.qualifications) ? data.qualifications : [];
        this.specializationSubjects = Array.isArray(data.specializationSubjects) ? data.specializationSubjects : [];
        if (data.experienceYears != null) this.experienceYears = Number(data.experienceYears);
        if (data.panNumber) this.panNumber = data.panNumber;
        if (data.aadhaarNumber) this.aadhaarNumber = data.aadhaarNumber;

        if (data.assignedClassTeacherGroupId) {
            this.assignedClassTeacherGroupId = new ObjectId(data.assignedClassTeacherGroupId);
        }

        this.assignedSubjects = Array.isArray(data.assignedSubjects) ? data.assignedSubjects.map((s: any) => ({
            feeGroupId: new ObjectId(s.feeGroupId),
            feeGroupName: s.feeGroupName || undefined,
            subjectName: s.subjectName
        })) : [];

        this.monthlySalary = data.monthlySalary != null ? Number(data.monthlySalary) : 0;
        this.hra = data.hra != null ? Number(data.hra) : 0;
        this.allowances = data.allowances != null ? Number(data.allowances) : 0;
        this.pfDeduction = data.pfDeduction != null ? Number(data.pfDeduction) : 0;
        this.taxDeduction = data.taxDeduction != null ? Number(data.taxDeduction) : 0;
        this.salaryType = data.salaryType || 'monthly';
        if (data.joiningDate) this.joiningDate = data.joiningDate;
        this.employmentType = data.employmentType || 'full-time';
        this.status = data.status || 'active';
        if (data.address) this.address = data.address;
        if (data.emergencyContact) this.emergencyContact = data.emergencyContact;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid(): boolean {
        return !!(this.entityId && this.name && this.contactNumber && this.role);
    }
}
