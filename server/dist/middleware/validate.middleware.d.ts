import { Request, Response, NextFunction } from 'express';
import { Schema } from 'zod';
export declare const validateRequest: (schema: Schema) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=validate.middleware.d.ts.map