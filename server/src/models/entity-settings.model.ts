import { ObjectId } from 'mongodb';

export interface StaffRoleSetting {
    label: string;
    code: string;
    enable_login: boolean;
}

export interface EntityLabelsSetting {
    memberSingle: string;
    memberPlural: string;
    groupSingle: string;
    groupPlural: string;
    planSingle: string;
    planPlural: string;
    collectionLabel: string;
    memberIcon: string;
    groupIcon: string;
    isBusinessMode: boolean;
    hasAcademicYears: boolean;
}

export const DEFAULT_PG_LABELS: EntityLabelsSetting = {
    memberSingle: 'Tenant',
    memberPlural: 'Tenants',
    groupSingle: 'Room',
    groupPlural: 'Rooms',
    planSingle: 'Rent Plan',
    planPlural: 'Rent Plans',
    collectionLabel: 'Rent Collections',
    memberIcon: '🪪',
    groupIcon: '🛏️',
    isBusinessMode: true,
    hasAcademicYears: false
};

export const DEFAULT_GYM_LABELS: EntityLabelsSetting = {
    memberSingle: 'Member',
    memberPlural: 'Members',
    groupSingle: 'Plan',
    groupPlural: 'Plans',
    planSingle: 'Billing Plan',
    planPlural: 'Billing Plans',
    collectionLabel: 'Total Collections',
    memberIcon: '👥',
    groupIcon: '💳',
    isBusinessMode: true,
    hasAcademicYears: false
};

export const DEFAULT_SCHOOL_LABELS: EntityLabelsSetting = {
    memberSingle: 'Student',
    memberPlural: 'Students',
    groupSingle: 'Class',
    groupPlural: 'Classes',
    planSingle: 'Fee Structure',
    planPlural: 'Fee Structures',
    collectionLabel: 'Fee Collections',
    memberIcon: '🎒',
    groupIcon: '📚',
    isBusinessMode: false,
    hasAcademicYears: true
};

export const DEFAULT_GYM_STAFF_ROLES: StaffRoleSetting[] = [
    { label: 'Admin', code: 'admin', enable_login: true },
    { label: 'Staff', code: 'staff', enable_login: false }
];

export const DEFAULT_PG_STAFF_ROLES: StaffRoleSetting[] = [
    { label: 'Admin', code: 'admin', enable_login: true },
    { label: 'PG Manager', code: 'staff', enable_login: false }
];

export const DEFAULT_SCHOOL_STAFF_ROLES: StaffRoleSetting[] = [
    { label: 'Admin', code: 'admin', enable_login: true },
    { label: 'Teacher', code: 'teacher', enable_login: true },
    { label: 'Staff', code: 'staff', enable_login: false }
];

export interface AdmissionNumberSetting {
    prefix: string;          // e.g. "ADM-" or "DPS-"
    includeYear: boolean;    // e.g. true -> "ADM-2025-0001"
    startingNumber: number;  // e.g. 1 or 1001
    paddingDigits: number;   // e.g. 4 -> "0001"
    autoGenerate: boolean;   // default true
}

export const DEFAULT_SCHOOL_ADMISSION_CONFIG: AdmissionNumberSetting = {
    prefix: 'ADM-',
    includeYear: true,
    startingNumber: 1,
    paddingDigits: 4,
    autoGenerate: true
};

export const DEFAULT_BUSINESS_ADMISSION_CONFIG: AdmissionNumberSetting = {
    prefix: 'TEN-',
    includeYear: false,
    startingNumber: 1,
    paddingDigits: 4,
    autoGenerate: true
};

export interface EntityFirebaseConfig {
    enabled: boolean;
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    senderId?: string;
    appName?: string;
    updatedAt?: Date;
}

export class EntitySettings {
    _id?: ObjectId;
    entityType: string;
    labels: EntityLabelsSetting;
    staffRoles: StaffRoleSetting[];
    admissionConfig: AdmissionNumberSetting;
    firebaseConfig?: EntityFirebaseConfig;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any, defaultType: string = 'gym') {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityType = data.entityType || defaultType;
        
        const typeLower = (this.entityType || 'gym').toLowerCase();
        const defaultLabels = (typeLower === 'pg' || typeLower === 'hostel')
            ? DEFAULT_PG_LABELS
            : (typeLower === 'gym' ? DEFAULT_GYM_LABELS : DEFAULT_SCHOOL_LABELS);

        const defaultRoles = (typeLower === 'pg' || typeLower === 'hostel')
            ? DEFAULT_PG_STAFF_ROLES
            : (typeLower === 'gym' ? DEFAULT_GYM_STAFF_ROLES : DEFAULT_SCHOOL_STAFF_ROLES);

        const defaultAdmissionConfig = (typeLower === 'school')
            ? DEFAULT_SCHOOL_ADMISSION_CONFIG
            : DEFAULT_BUSINESS_ADMISSION_CONFIG;

        this.labels = data.labels ? { ...defaultLabels, ...data.labels } : defaultLabels;
        this.staffRoles = Array.isArray(data.staffRoles) && data.staffRoles.length > 0
            ? data.staffRoles
            : defaultRoles;
        this.admissionConfig = data.admissionConfig
            ? { ...defaultAdmissionConfig, ...data.admissionConfig }
            : defaultAdmissionConfig;
        if (data.firebaseConfig) {
            this.firebaseConfig = data.firebaseConfig;
        }
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
}
