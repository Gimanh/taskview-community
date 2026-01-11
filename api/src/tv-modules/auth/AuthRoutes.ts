import { Router, type NextFunction, type Request, type Response } from 'express';
import type { Routable } from '../../types/routable.type';
import AuthController from './AuthController';
import { IsLoggedIn } from './middlewares/is-logged-in';
import passport from './strategies/passport-login';
import { ExternalProviderScope } from './strategies/external-auth.types';
export default class AuthRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly authController: AuthController;

    constructor() {
        this.router = Router();
        this.authController = new AuthController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.post('/send-login-code', this.authController.sendLoginCode);
        this.router.post('/login-by-code', this.authController.loginByCode);
        this.router.post('/login', this.authController.login);
        this.router.post('/registration', this.authController.registration);
        this.router.get('/confirm/email/:code/login/:login', this.authController.confirmEmail);
        this.router.post('/email/recovery', this.authController.remindPassword);
        this.router.post('/password/reset', this.authController.changeRemindedPassword);
        this.router.post('/logout', [IsLoggedIn], this.authController.logout);
        this.router.post('/refresh/token', this.authController.refreshTokens);
        this.router.post('/delete/account/code', [IsLoggedIn], this.authController.sendDeleteAccountCode);
        this.router.post('/delete/account', [IsLoggedIn], this.authController.deleteUserAccaunt);

        this.router.get(
            '/provider/:providerName',
            (req: Request, res: Response, next: NextFunction) => passport.authenticate(req.params.providerName, {
                scope: ExternalProviderScope[req.params.providerName],
                session: false,
                state: JSON.stringify({
                    platform: req.query.platform || '',
                })
            })(req, res, next)
        );
        this.router.get(
            '/provider/:providerName/callback',
            (req: Request, res: Response, next: NextFunction) => passport.authenticate(req.params.providerName, {
                scope: ExternalProviderScope[req.params.providerName], session: false
            })(req, res, next),
            this.authController.loginByProvider
        );
    }
}
