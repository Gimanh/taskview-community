import type { NextFunction, Request, Response } from 'express';
import { AccountDeletion } from '../AccountDeletion';

export const RequireAccountDeletion = (_req: Request, res: Response, next: NextFunction) => {
    if (!AccountDeletion.allowed()) {
        return res.status(403).send();
    }
    return next();
};
