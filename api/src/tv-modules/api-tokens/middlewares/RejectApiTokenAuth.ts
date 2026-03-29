import type { NextFunction, Request, Response } from 'express';

export const RejectApiTokenAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.appUser.isApiTokenAuth()) {
        return res.status(403).end();
    }
    return next();
};
