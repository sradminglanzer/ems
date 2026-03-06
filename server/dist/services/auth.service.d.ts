import { BaseService } from './base.service';
import { User } from '../models/types';
import { ObjectId } from 'mongodb';
declare class AuthService extends BaseService<User> {
    constructor();
    handleLoginOrSetup(contactNumber: string, entityId: string, mpin?: string): Promise<{
        requiresSetup: boolean;
        message: "MPIN setup required";
        token?: never;
        user?: never;
    } | {
        message: "MPIN setup successful";
        token: string;
        user: {
            id: ObjectId | undefined;
            entityId: ObjectId;
            name: string;
            role: import("../models/types").UserRole;
            contactNumber: string;
            activeAcademicYearId: any;
            activeAcademicYearName: any;
        };
        requiresSetup?: never;
    } | {
        message: "Login successful";
        token: string;
        user: {
            id: ObjectId | undefined;
            entityId: ObjectId;
            name: string;
            role: import("../models/types").UserRole;
            contactNumber: string;
            activeAcademicYearId: any;
            activeAcademicYearName: any;
        };
        requiresSetup?: never;
    }>;
    private generateToken;
    private formatUserResponse;
}
declare const _default: AuthService;
export default _default;
//# sourceMappingURL=auth.service.d.ts.map