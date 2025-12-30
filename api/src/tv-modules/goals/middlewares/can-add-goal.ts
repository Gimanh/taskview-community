import type { NextFunction, Request, Response } from 'express';

export const canAddGoal = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.appUser.isBlocked()) {
        return next();
    }

    return res.status(403).end();
};
