import type { NextFunction, Request, Response } from 'express';
import type { LoginMethod } from '../../../types/auth.types';
import { LoginMethods } from '../LoginMethods';

export const RequireLoginMethod = (method: LoginMethod) => {
    return (_req: Request, res: Response, next: NextFunction) => {
        if (!LoginMethods.isEnabled(method)) {
            return res.status(403).send();
        }
        return next();
    };
};

export const RequireAnyLoginMethod = (methods: LoginMethod[]) => {
    return (_req: Request, res: Response, next: NextFunction) => {
        if (!methods.some((method) => LoginMethods.isEnabled(method))) {
            return res.status(403).send();
        }
        return next();
    };
};

export const RequireSocialProvider = (req: Request, res: Response, next: NextFunction) => {
    const providerName = String(req.params.providerName || '').toLowerCase();
    if (!LoginMethods.availableSocialProviders().includes(providerName)) {
        return res.status(403).send();
    }
    return next();
};
