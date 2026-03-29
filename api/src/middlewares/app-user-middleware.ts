import type { NextFunction, Request, Response } from 'express';
import { AppUser } from '../core/AppUser';
import { $logger } from '../modules/logget';
import AuthController from '../tv-modules/auth/AuthController';
import { getApiTokensManager } from '../tv-modules/api-tokens/ApiTokensManager';
import { TOKEN_PREFIX } from '../tv-modules/api-tokens/types';

export const appUserMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (token && token.startsWith(TOKEN_PREFIX)) {
        const record = await getApiTokensManager().validateToken(token);
        if (record) {
            const authManager = new AppUser().authManager;
            const userData = await authManager.repository.fetchUserById(record.userId);
            if (userData && userData.block === 0) {
                req.appUser = new AppUser({
                    id: 0,
                    userData: { id: userData.id, login: userData.login, email: userData.email },
                });
                req.appUser.setUserDataFromDb(userData);
                req.appUser.setHasActiveToken(true);
                req.appUser.setApiTokenAuth(record.allowedPermissions, record.allowedGoalIds);
            } else {
                req.appUser = new AppUser();
            }
        } else {
            req.appUser = new AppUser();
        }
        return next();
    }

    if (token) {
        const userPayload = await AuthController.validateTokens(token);
        if (userPayload) {
            req.appUser = new AppUser(userPayload);
            try {
                const [sessionActive, userData] = await Promise.allSettled([
                    req.appUser.authManager.sessionStorage.isSessionActive(userPayload.id),
                    req.appUser.authManager.repository.fetchUserById(userPayload.userData.id),
                ]);

                if (sessionActive.status === 'fulfilled' && sessionActive.value) {
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
