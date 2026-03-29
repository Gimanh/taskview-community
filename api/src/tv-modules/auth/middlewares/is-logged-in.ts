import type { NextFunction, Request, Response } from 'express';
import AuthController from '../AuthController';

export const IsLoggedIn = async (req: Request, res: Response, next: NextFunction) => {
    if (req.appUser.isApiTokenAuth() && !req.appUser.isBlocked()) {
        return next();
    }

    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        const userPayload = await AuthController.validateTokens(token);
        if (
            userPayload
            && req.appUser.getTokenId() === userPayload.id
            && req.appUser.getHasActiveToken()
            && !req.appUser.isBlocked()
        ) {
            return next();
        }
    }
    return res.status(401).end();
};
