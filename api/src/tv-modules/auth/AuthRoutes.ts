import { Router, type NextFunction, type Request, type Response } from 'express';
import type { Routable } from '../../types/routable.type';
import AuthController from './AuthController';
import { IsLoggedIn } from './middlewares/is-logged-in';
import { RejectApiTokenAuth } from '../api-tokens/middlewares/RejectApiTokenAuth';
import { RequireAnyLoginMethod, RequireLoginMethod, RequireSocialProvider } from './middlewares/require-login-method';
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
        this.router.get('/login-options', this.authController.getLoginOptions);
        this.router.post('/send-login-code', [RequireLoginMethod('magic-link')], this.authController.sendLoginCode);
        // Shared one-time-code redemption: magic-link emails, SSO callbacks and social
        // OAuth callbacks all complete the login through this endpoint
        this.router.post('/login-by-code', [RequireAnyLoginMethod(['magic-link', 'sso', 'social'])], this.authController.loginByCode);
        this.router.post('/login', [RequireLoginMethod('password')], this.authController.login);
        this.router.post('/registration', this.authController.registration);
        this.router.get('/confirm/email/:code/login/:login', this.authController.confirmEmail);
        this.router.post('/email/recovery', [RequireLoginMethod('password')], this.authController.remindPassword);
        this.router.post('/password/reset', [RequireLoginMethod('password')], this.authController.changeRemindedPassword);
        this.router.get('/password/change/mode', [IsLoggedIn], this.authController.getPasswordChangeMode);
        this.router.post('/password/change/code', [IsLoggedIn, RejectApiTokenAuth], this.authController.sendPasswordChangeCode);
        this.router.post('/password/change', [IsLoggedIn, RejectApiTokenAuth], this.authController.changeOwnPassword);
        this.router.post('/credentials/change', [IsLoggedIn, RejectApiTokenAuth], this.authController.changeDefaultUserCredentials);
        this.router.post('/logout', [IsLoggedIn], this.authController.logout);
        this.router.post('/refresh/token', this.authController.refreshTokens);
        this.router.post('/delete/account/code', [IsLoggedIn], this.authController.sendDeleteAccountCode);
        this.router.post('/delete/account', [IsLoggedIn], this.authController.deleteUserAccaunt);

        this.router.get(
            '/provider/:providerName',
            RequireSocialProvider,
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
            RequireSocialProvider,
            (req: Request, res: Response, next: NextFunction) => passport.authenticate(req.params.providerName, {
                scope: ExternalProviderScope[req.params.providerName], session: false
            })(req, res, next),
            this.authController.loginByProvider
        );

        this.router.post(
            '/provider/:providerName/callback',
            RequireSocialProvider,
            (req: Request, res: Response, next: NextFunction) => passport.authenticate(req.params.providerName, {
                scope: ExternalProviderScope[req.params.providerName], session: false
            })(req, res, next),
            this.authController.loginByProvider
        );
    }
}
