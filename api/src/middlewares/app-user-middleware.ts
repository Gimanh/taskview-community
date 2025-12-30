import type { NextFunction, Request, Response } from 'express';
import { AppUser } from '../core/AppUser';
import { $logger } from '../modules/logget';
import AuthController from '../tv-modules/auth/AuthController';

export const appUserMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        const userPayload = await AuthController.validateTokens(token);
        if (userPayload) {
            req.appUser = new AppUser(userPayload);
            try {
                const [tokens, userData] = await Promise.allSettled([
                    req.appUser.authManager.jwtStorage.fetchTokens(userPayload.id),
                    req.appUser.authManager.repository.fetchUserById(userPayload.userData.id),
                ]);

                if (tokens.status === 'fulfilled') {
                    req.appUser.setHasActiveToken(true);
                }

                if (userData.status === 'fulfilled' && userData.value) {
                    req.appUser.setUserDataFromDb(userData.value);
                }
            } catch (error: any) {
                $logger.error(error);
            }
        } else {
            req.appUser = new AppUser();
        }
    } else {
        req.appUser = new AppUser();
    }
    return next();
};
