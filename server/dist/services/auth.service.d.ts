import { BaseService } from './base.service';
import { User } from '../models/types';
declare class AuthService extends BaseService<User> {
    constructor();
    handleLoginOrSetup(contactNumber: string, mpin?: string): Promise<{
        requiresSetup: boolean;
        message: "MPIN setup required";
        token?: never;
        user?: never;
    } | {
        message: "MPIN setup successful";
        token: string;
        user: {
            id: import("bson").ObjectId | undefined;
            name: string;
            role: import("../models/types").UserRole;
        };
        requiresSetup?: never;
    } | {
        message: "Login successful";
        token: string;
        user: {
            id: import("bson").ObjectId | undefined;
            name: string;
            role: import("../models/types").UserRole;
        };
        requiresSetup?: never;
    }>;
    private generateToken;
    private formatUserResponse;
}
declare const _default: AuthService;
export default _default;
//# sourceMappingURL=auth.service.d.ts.map