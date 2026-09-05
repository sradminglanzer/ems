import { ObjectId } from 'mongodb';

export interface IMemberDocument {
    title: string;        // e.g., "Student Aadhaar", "Birth Certificate", "Transfer Certificate", "Previous Marksheet"
    url: string;          // S3 or public document URL
    docType: string;      // "birth_certificate" | "aadhaar" | "tc" | "marksheet" | "caste_certificate" | "photo" | "other"
    uploadedAt?: Date;
}

export class Member {
    _id?: ObjectId;
    entityId: ObjectId;
    academicYearId?: ObjectId;

    // ── Documents & Certificates ───────────────────────────────────────────────
    documents?: IMemberDocument[];

    // ── Student Identity ───────────────────────────────────────────────────────
    firstName: string;
    middleName?: string;
    lastName: string;
    knownId: string;           // Roll / Student ID
    admissionNo?: string;      // Official Permanent Admission / SR No
    rollNo?: string;           // Class Roll No
    apaarId?: string;          // APAAR / PEN / National Student ID
    aadhaarNo?: string;        // 12-digit Student Aadhaar
    dob?: string;
    gender?: 'male' | 'female' | 'other';
    placeOfBirth?: string;
    nationality?: string;
    motherTongue?: string;
    religion?: string;
    casteCategory?: string;    // General / OC, OBC, SC, ST, EWS
    subCaste?: string;
    bloodGroup?: string;
    medicalNotes?: string;
    identificationMarks?: string;

    // ── Contact & Family Info ──────────────────────────────────────────────────
    contact?: string;          // Primary Contact / WhatsApp
    altContact?: string;       // Secondary Contact
    email?: string;
    parentPin?: string;        // 4-Digit Security PIN for Parent Portal Login

    // Father Details
    fatherName?: string;
    fatherAadhaar?: string;
    fatherQualification?: string;
    fatherOccupation?: string;
    fatherIncome?: string;
    fatherPhone?: string;
    fatherEmail?: string;

    // Mother Details
    motherName?: string;
    motherAadhaar?: string;
    motherQualification?: string;
    motherOccupation?: string;
    motherIncome?: string;
    motherPhone?: string;
    motherEmail?: string;

    // Guardian Details (if applicable)
    guardianName?: string;
    guardianRelation?: string;
    guardianPhone?: string;
    guardianAddress?: string;

    // ── Address & Emergency ───────────────────────────────────────────────────
    address?: string;          // Present Address
    presentAddress?: string;
    permanentAddress?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;

    // ── Previous Academic History ─────────────────────────────────────────────
    previousSchoolName?: string;
    previousBoard?: string;
    previousClassPassed?: string;
    tcNumber?: string;
    tcDate?: string;
    previousPercentage?: string;

    // ── Fees & Concessions ────────────────────────────────────────────────────
    feeGroupId?: ObjectId;     // Class / Section / Room / Batch
    feeStructureId?: ObjectId; // Primary Fee Package
    addonFeeIds?: ObjectId[];
    concessionType?: string;   // Sibling, Staff Child, Merit, Custom
    concessionValue?: number;  // % or fixed amount
    concessionReason?: string;

    // ── Status & Lifecycle ────────────────────────────────────────────────────
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
        if (data.academicYearId) this.academicYearId = typeof data.academicYearId === 'string' ? new ObjectId(data.academicYearId) : data.academicYearId;

        // Student Identity
        this.firstName = data.firstName || data.first_name || '';
        this.middleName = data.middleName || data.middle_name;
        this.lastName = data.lastName || data.last_name || '';
        this.knownId = data.knownId || data.known_id || data.rollNumber || data.admissionNo || '';
        this.admissionNo = data.admissionNo || data.admission_no;
        this.rollNo = data.rollNo || data.roll_no;
        this.apaarId = data.apaarId || data.apaar_id || data.penNo;
        this.aadhaarNo = data.aadhaarNo || data.aadhaar_no;
        this.dob = data.dob || data.dateOfBirth;
        this.gender = data.gender;
        this.placeOfBirth = data.placeOfBirth || data.place_of_birth;
        this.nationality = data.nationality || 'Indian';
        this.motherTongue = data.motherTongue || data.mother_tongue;
        this.religion = data.religion;
        this.casteCategory = data.casteCategory || data.caste_category || data.category;
        this.subCaste = data.subCaste || data.sub_caste;
        this.bloodGroup = data.bloodGroup || data.blood_group;
        this.medicalNotes = data.medicalNotes || data.medical_notes;
        this.identificationMarks = data.identificationMarks || data.identification_marks;

        // Contacts & Parents
        this.contact = data.contact || data.contactNumber || data.phone || data.fatherPhone;
        this.altContact = data.altContact || data.alt_contact || data.motherPhone;
        this.email = data.email;
        this.parentPin = data.parentPin || data.parent_pin;

        // Father
        this.fatherName = data.fatherName || data.father_name;
        this.fatherAadhaar = data.fatherAadhaar || data.father_aadhaar;
        this.fatherQualification = data.fatherQualification || data.father_qualification;
        this.fatherOccupation = data.fatherOccupation || data.father_occupation;
        this.fatherIncome = data.fatherIncome || data.father_income;
        this.fatherPhone = data.fatherPhone || data.father_phone;
        this.fatherEmail = data.fatherEmail || data.father_email;

        // Mother
        this.motherName = data.motherName || data.mother_name;
        this.motherAadhaar = data.motherAadhaar || data.mother_aadhaar;
        this.motherQualification = data.motherQualification || data.mother_qualification;
        this.motherOccupation = data.motherOccupation || data.mother_occupation;
        this.motherIncome = data.motherIncome || data.mother_income;
        this.motherPhone = data.motherPhone || data.mother_phone;
        this.motherEmail = data.motherEmail || data.mother_email;

        // Guardian
        this.guardianName = data.guardianName || data.guardian_name;
        this.guardianRelation = data.guardianRelation || data.guardian_relation;
        this.guardianPhone = data.guardianPhone || data.guardian_phone;
        this.guardianAddress = data.guardianAddress || data.guardian_address;

        // Addresses
        this.address = data.address || data.presentAddress;
        this.presentAddress = data.presentAddress || data.present_address || data.address;
        this.permanentAddress = data.permanentAddress || data.permanent_address;
        this.city = data.city;
        this.district = data.district;
        this.state = data.state;
        this.pincode = data.pincode;
        this.emergencyContactName = data.emergencyContactName || data.emergency_contact_name;
        this.emergencyContactPhone = data.emergencyContactPhone || data.emergency_contact_phone;
        this.emergencyContactRelation = data.emergencyContactRelation || data.emergency_contact_relation;

        // Previous School
        this.previousSchoolName = data.previousSchoolName || data.previous_school_name;
        this.previousBoard = data.previousBoard || data.previous_board;
        this.previousClassPassed = data.previousClassPassed || data.previous_class_passed;
        this.tcNumber = data.tcNumber || data.tc_number;
        this.tcDate = data.tcDate || data.tc_date;
        this.previousPercentage = data.previousPercentage || data.previous_percentage;

        // Fees & Concessions
        if (data.feeGroupId) this.feeGroupId = typeof data.feeGroupId === 'string' ? new ObjectId(data.feeGroupId) : data.feeGroupId;
        if (data.feeStructureId) this.feeStructureId = typeof data.feeStructureId === 'string' ? new ObjectId(data.feeStructureId) : data.feeStructureId;
        if (Array.isArray(data.addonFeeIds)) {
            this.addonFeeIds = data.addonFeeIds.map((id: any) => typeof id === 'string' ? new ObjectId(id) : id);
        }
        this.concessionType = data.concessionType || data.concession_type;
        this.concessionValue = Number(data.concessionValue) || 0;
        this.concessionReason = data.concessionReason || data.concession_reason;

        // Lifecycle & Status
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
        if (Array.isArray(data.documents)) {
            this.documents = data.documents.map((d: any) => ({
                title: d.title || 'Document',
                url: d.url || '',
                docType: d.docType || d.type || 'other',
                uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date()
            }));
        } else {
            this.documents = [];
        }

        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    get valid() {
        return !!(this.firstName && this.entityId);
    }
}
