import { compare, hashSync } from 'bcryptjs';
import { randomInt } from 'crypto';
import type { Request, Response } from 'express';
import jwt, { type Algorithm, decode } from 'jsonwebtoken';
import { z } from 'zod';
import { Email } from '../../core/Email';
import { $logger } from '../../modules/logget';
import {
    ChangeDefaultUserCredentialsSchema,
    ChangeOwnPasswordByPasswordSchema,
    ChangeOwnPasswordSchema,
    ChangePasswordDataScheme,
    DeleteAccountSchema,
    type PasswordChangeConfirmationMode,
    ConfirmEmailReqDataSchema,
    RefreshTokenSchema,
    RemindPasswordSchema,
    type UserDbRecord,
    type UserJwtPayload,
    UserJwtPayloadSchema,
    AuthTokenPayloadSchema,
    type ValidateTokenArgs,
} from '../../types/auth.types';
import { safeEqual } from '../../utils/crypto';
import { generateString, isEmail, time } from '../../utils/helpers';
import { AccountDeletion } from './AccountDeletion';
import { LoginMethods } from './LoginMethods';
import EnEmailTemplate from './mail/confirm-email-en';
import RuEmailTemplate from './mail/confirm-email-ru';
import LoginCodeEmailTemplate from './mail/login-code-en';
import type { ExternalAuthUser } from './strategies/external-auth.types';
import { OrganizationRepository } from '../organizations/OrganizationRepository';
import { GoalsRepository } from '../goals/GoalsRepository';

const LOGIN_CODE_TTL_MS = 5 * 60 * 1000;
const LOGIN_CODE_MAX_ATTEMPTS = 5;
const PASSWORD_CHANGE_CODE_TTL_S = 15 * 60;
const PASSWORD_CHANGE_CODE_RESEND_COOLDOWN_S = 60;
// Seeded by migration 0.0.0 (app_permissions.sql) on self-hosted installs.
const DEFAULT_USER_EMAIL = 'test@mail.dest';

export default class AuthController {
    private readonly jwtAlg: Algorithm = process.env.JWT_ALG as Algorithm;
    private readonly jwtExp: string = process.env.ACCESS_LIFE_TIME!;
    private readonly jwtRefreshExp: string = process.env.REFRESH_LIFE_TIME!;

    private readonly refreshTokenCookieName: string = 'taskview-refresh';
    private readonly orgRepository: OrganizationRepository = new OrganizationRepository();
    private readonly goalsRepository: GoalsRepository = new GoalsRepository();

    private async createPersonalWorkspace(userId: number, email: string, login: string) {
        const slug = `org-${crypto.randomUUID().slice(0, 8)}`
        const org = await this.orgRepository.create({ name: `${login}'s workspace`, slug }, userId, true)
        if (org) {
            await this.orgRepository.addMember(org.id, email, 'owner')
            await this.goalsRepository.createInboxGoal({ ownerId: userId, organizationId: org.id })
        }
    }

    comparePasswords(pwd: string, hash: string): Promise<boolean> {
        return new Promise((resolve) => {
            //Prev version was written in PHP need to replace
            compare(pwd, hash.replace('$2y$', '$2a$'), (_err, result) => {
                resolve(result);
            });
        });
    }

    getTokens(userPayload: UserJwtPayload) {
        const cleanPayload = UserJwtPayloadSchema.safeParse(userPayload);
        if (!cleanPayload.success) {
            $logger.error('Can not parse JWT payload');
        }

        // typ keeps the two apart: an access token cannot be exchanged for new tokens, a refresh token cannot authorize requests
        //@ts-expect-error 
        const access = jwt.sign({ ...cleanPayload.data!, typ: 'access' }, process.env.JWT_SIGN as string, {
            algorithm: this.jwtAlg,
            expiresIn: this.jwtExp,
        });

        //@ts-expect-error 
        const refresh = jwt.sign({ ...cleanPayload.data!, typ: 'refresh' }, process.env.JWT_SIGN as string, {
            algorithm: this.jwtAlg,
            expiresIn: this.jwtRefreshExp,
        });

        return {
            access,
            refresh,
            type: 'jwt',
            userData: cleanPayload.data?.userData,
        };
    }

    static validateTokens(args: ValidateTokenArgs): Promise<UserJwtPayload | undefined> {
        return new Promise((resolve) => {
            jwt.verify(
                args.token,
                process.env.JWT_SIGN as string,
                { algorithms: [process.env.JWT_ALG as Algorithm] },
                (err, payload) => {
                    if (err) {
                        resolve(undefined);
                        return;
                    }
                    // Other JWTs signed with JWT_SIGN (e.g. OAuth state) do not carry a session payload
                    const parsed = AuthTokenPayloadSchema.safeParse(payload);
                    if (!parsed.success) {
                        resolve(undefined);
                        return;
                    }
                    if (parsed.data.typ !== args.type) {
                        resolve(undefined);
                        return;
                    }
                    resolve({ id: parsed.data.id, userData: parsed.data.userData });
                }
            );
        });
    }

    makeidLogin(length: number) {
        let result = ''
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length
        for (let i = 0; i < length; i++) {
            result += characters.charAt(randomInt(charactersLength))
        }
        return result
    }

    generateEmailConfirmCode() {
        return this.makeidLogin(16);
    }

    generateLoginCode() {
        const code = String(randomInt(100000, 1000000));
        return `${code}:${Date.now()}`;
    }
    /**
     * Register user by email and send login code to the email
     * @param req
     * @param res
     * @returns
     */
    sendLoginCode = async (req: Request, res: Response) => {
        const schema = z.object({
            email: z.string().email().toLowerCase(),
        });

        const data = schema.safeParse(req.body);

        if (!data.success) {
            return res.status(400).end();
        }

        const { email } = data.data;

        const code = this.generateLoginCode();


        let userData = await req.appUser.authManager.repository.getUserByLogin(email, isEmail(email));

        if (userData) {
            $logger.info(!!userData, `[AuthController:sendLoginCode] user already exist in database`);
        } else {
            $logger.info(!!userData, `[AuthController:sendLoginCode] user does not exist in database`);
        }

        if (!userData) {
            if (!(await this.canCreateAccount(req, email))) {
                $logger.info(`[AuthController:sendLoginCode] public registration disabled, email not invited`);
                return res.status(403).send({ registrationDisabled: true });
            }

            const password = this.makeidLogin(7),
                login = this.makeidLogin(7);

            const id = await req.appUser.authManager.repository.registerUserInDb({
                login,
                email,
                password: hashSync(password, 10),
                block: 0,
                confirmEmailCode: '',
            });
            if (!id) {
                $logger.error(`Can not register user`);
                return res.status(500).end();
            }

            await this.createPersonalWorkspace(id, email, login)
            $logger.info(`[AuthController:sendLoginCode] user registered`);
        }

        userData = await req.appUser.authManager.repository.getUserByLogin(email, isEmail(email));

        if (!userData) {
            $logger.error(`Can not fetch user after registration by code`);
            return res.status(500).end();
        }

        const lastUpdate = userData.remember_token?.split(':')[1];
        const now = Date.now();
        const RESEND_COOLDOWN_MS = 60 * 1000;

        if (lastUpdate && now - +lastUpdate < RESEND_COOLDOWN_MS) {
            return res.status(429).send({
                message: 'Please wait before requesting another code.',
                retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (now - +lastUpdate)) / 1000),
            });
        }

        const reservation = await req.appUser.authManager.repository.reserveLoginCodeSend({
            userId: userData.id,
            hourlyLimit: LoginMethods.loginCodeHourlyLimit(),
        });
        if (!reservation.allowed) {
            $logger.warn({ userId: userData.id }, '[AuthController:sendLoginCode] hourly login code limit reached');
            return res.status(429).send({
                message: 'Too many codes requested, try again later.',
                retryAfter: reservation.retryAfterSeconds,
            });
        }

        $logger.info(`[AuthController:sendLoginCode] updating login code for user`);
        await req.appUser.authManager.repository.updateLoginCode(code, email);
        $logger.info(`[AuthController:sendLoginCode] sending code by email to`);
        this.sendCodeByEmail(code.split(':')[0], email)
            .then((ok) => {
                if (!ok) $logger.error({ email }, 'Failed to send login code email');
            })
            .catch((err) => $logger.error({ err, email }, 'Failed to send login code email'));
        return res.status(200).end();
    };

    async sendCodeByEmail(code: string, email: string) {
        const text = `Your TaskView verification code is ${code}\n\nUse this code to sign in. The code expires in 5 minutes.\n\nIf you didn't request this code, ignore this email.`;
        const html = LoginCodeEmailTemplate.replace('{code}', code);

        return await Email.send({
            text,
            to: email,
            subject: `Your TaskView code: ${code}`,
            from: process.env.SMTP_FROM_EMAIL as string,
            attachment: [{ data: html, alternative: true }],
        });
    }

    loginByProvider = async (req: Request, res: Response) => {
        const user = req.user as ExternalAuthUser;

        if (!user) {
            return res.status(400).send('User not found');
        }

        // Providers may return mixed-case addresses; every other login path stores emails lowercased
        const email = user.email.trim().toLowerCase();

        let userData = await req.appUser.authManager.repository.getUserByLogin(
            email,
            isEmail(email)
        );

        if (!userData) {
            if (!(await this.canCreateAccount(req, email))) {
                $logger.info(`[AuthController:loginByProvider] public registration disabled, email not invited`);
                return res.redirect(`${process.env.APP_URL}/login?sso_error=registration-disabled`);
            }

            const password = this.makeidLogin(7);
            const login = this.makeidLogin(7);

            const id = await req.appUser.authManager.repository.registerUserInDb({
                login,
                email,
                password: hashSync(password, 10),
                block: 0,
                confirmEmailCode: '',
            });

            if (!id) {
                $logger.error(`Can not register user`);
                return res.status(500).send(`Can not register user`);
            }

            await this.createPersonalWorkspace(id, email, login)

            userData = await req.appUser.authManager.repository.getUserByLogin(
                email,
                isEmail(email)
            );
        }

        if (!userData) {
            $logger.error(`Can not find user after registration`);
            return res.status(500).send(`Can not find user ${email} after registration`);
        }

        const code = this.generateLoginCode();

        const result = await req.appUser.authManager.repository.updateLoginCode(code, userData.email);

        if (!result) {
            $logger.error(`Can not update login code for user`);
            return res.status(500).send(`Can not update login code for user`);
        }

        const authData = {
            code: code.split(':')[0],
            email: userData.email,
        };

        const encodedAuthData = encodeURIComponent(JSON.stringify(authData));

        try {
            const platformData = JSON.parse(req.query.state as string);

            if (platformData.platform === "mobile") {
                return res.redirect(
                    `taskview://login?tokens=${encodedAuthData}`
                );
            }
        } catch (error) {
            $logger.info(`Can not parse platform data from state: ${req.query.state}`);
        }

        return res.redirect(`${process.env.APP_URL}/login?tokens=${encodedAuthData}`);
    }

    private parseLifetimeToMs(lifetime: string): number {
        const match = lifetime.match(/^(\d+)([smhdw])$/)
        if (!match) return 1000 * 60 * 60 * 24 * 30
        const value = parseInt(match[1])
        const unit = match[2]
        const multipliers: Record<string, number> = {
            s: 1_000,
            m: 60_000,
            h: 3_600_000,
            d: 86_400_000,
            w: 604_800_000,
        }
        return value * (multipliers[unit] || 86_400_000)
    }

    setRefreshToken = async (res: Response, refreshToken: string) => {
        res.cookie(this.refreshTokenCookieName, refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: this.parseLifetimeToMs(this.jwtRefreshExp),
        });
    }

    clearRefreshToken = (res: Response) => {
        res.clearCookie(this.refreshTokenCookieName, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
        });
    }

    loginByCode = async (req: Request, res: Response) => {
        const schema = z.object({
            email: z.string().trim().email().toLowerCase(),
            code: z.string().trim().min(6).max(64),
        });

        const data = schema.safeParse(req.body);
        if (!data.success) {
            return res.status(400).end();
        }

        const userData = await req.appUser.authManager.repository.getUserByLogin(
            data.data.email,
            isEmail(data.data.email)
        );

        // Unknown email, no pending code and a wrong code all answer the same way
        if (!userData) {
            return res.status(400).send({ message: 'Invalid code' });
        }

        const attempt = await req.appUser.authManager.repository.registerLoginCodeAttempt(userData.id);
        if (!attempt) {
            return res.status(400).send({ message: 'Invalid code' });
        }

        // The code stays in place after the limit, so the resend cooldown of sendLoginCode still applies
        if (attempt.attempts > LOGIN_CODE_MAX_ATTEMPTS) {
            return res.status(429).send({ message: 'Too many attempts, get new code' });
        }

        const tokenFromDb = attempt.rememberToken.split(':');

        if (tokenFromDb.length !== 2 || !safeEqual(tokenFromDb[0], data.data.code)) {
            return res.status(400).send({ message: 'Invalid code' });
        }

        if (tokenFromDb[1] && Date.now() - +tokenFromDb[1] > LOGIN_CODE_TTL_MS) {
            await req.appUser.authManager.repository.updateLoginCode(null, userData.email);
            return res.status(400).send({ message: 'Code expired, get new code' });
        }

        // Invalidate code immediately to prevent replay attacks
        const consumed = await req.appUser.authManager.repository.consumeLoginCode({
            userId: userData.id,
            rememberToken: attempt.rememberToken,
        });
        if (!consumed) {
            return res.status(400).send({ message: 'Invalid code' });
        }

        if (userData.block) {
            if (!userData.confirm_email_code) {
                return res.status(403).send({ message: 'account_blocked' });
            }
            const confirmed = await req.appUser.authManager.repository.markEmailConfirmed(userData.email);
            if (!confirmed) {
                return res.status(500).end();
            }
        }

        const sessionId = await req.appUser.authManager.sessionStorage.createSession(
            userData.id,
            req.ip,
            req.headers['user-agent']
        );
        if (!sessionId) {
            return res.status(500).end();
        }

        const tokens = this.getTokens({
            id: sessionId,
            userData,
        } as const);

        await this.setRefreshToken(res, tokens.refresh);

        return res.json(tokens);
    };

    login = async (req: Request, res: Response) => {
        let { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).end();
        }

        login = login.toLowerCase();

        const userData = await req.appUser.authManager.repository.getUserByLogin(login, isEmail(login));

        if (!userData) {
            return res.status(400).end();
        }

        if (userData.block) {
            return res.status(403).json({ message: 'Confirm you email' });
        }

        const valid = await this.comparePasswords(password, userData.password);
        if (valid) {
            const sessionId = await req.appUser.authManager.sessionStorage.createSession(
                userData.id,
                req.ip,
                req.headers['user-agent']
            );
            if (!sessionId) {
                return res.status(500).end();
            }

            const tokens = this.getTokens({
                id: sessionId,
                userData,
            } as const);

            await this.setRefreshToken(res, tokens.refresh);

            return res.json(tokens);
        }

        return res.status(400).end();
    };

    registration = async (req: Request, res: Response) => {
        let { email, password, passwordRepeat, login = this.makeidLogin(7).toLocaleLowerCase() } = req.body;
        if (password !== passwordRepeat) {
            return res.status(400).end();
        }

        email = (email as string).toLowerCase();
        if (!isEmail(email)) {
            return res.status(400).end();
        }

        if (!(await this.canCreateAccount(req, email))) {
            $logger.info(`[AuthController:registration] public registration disabled, email not invited`);
            return res.status(403).send({ registrationDisabled: true });
        }

        password = hashSync(password, 10);

        if (!(await this.comparePasswords(passwordRepeat, password))) {
            $logger.error('Can not verify two equals password for registration');
            return res.status(400).end();
        }

        const confirmEmailCode = this.generateEmailConfirmCode();
        const id = await req.appUser.authManager.repository.registerUserInDb({
            login,
            email,
            password,
            block: 1,
            confirmEmailCode: confirmEmailCode,
        });

        if (!id) {
            return res.status(500).end();
        }

        await this.createPersonalWorkspace(id, email, login)

        let emailTemplate: string = '';
        let confirmEmailBody: string = '';
        const acceptLanguage = req.headers['accept-language'];
        if (acceptLanguage) {
            const languages = acceptLanguage.split(',').map((lang) => lang.split(';')[0].trim());
            if (languages.includes('ru') || languages.some((lang) => lang.startsWith('ru-'))) {
                emailTemplate = RuEmailTemplate;
            }
        } else {
            emailTemplate = EnEmailTemplate;
        }

        const confirmUrl = `${process.env.APP_URL}/module/auth/confirm/email/${confirmEmailCode}/login/${login}`;

        if (emailTemplate) {
            confirmEmailBody = emailTemplate.replace('{link}', confirmUrl);
        } else {
            confirmEmailBody = confirmUrl;
        }

        const sendResult = await Email.send({
            text: null,
            to: email,
            subject: 'Confirm you email!',
            from: process.env.SMTP_FROM_EMAIL as string,
            attachment: [{ data: confirmEmailBody, alternative: true }],
        });

        if (!sendResult) {
            $logger.error(`Can not send email for conformation`);
        }

        res.json({ registration: true, confirmEmail: true });
    };

    confirmEmail = async (req: Request, res: Response) => {
        const data = ConfirmEmailReqDataSchema.safeParse(req.params);
        if (!data.success) {
            return res.status(400).end();
        }
        const result = await req.appUser.authManager.repository.confirmEmail(data.data.login, data.data.code, 0);
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Email confirmation</title>
</head>
<body>
<div style="display:flex; justify-content:center;">
    <div style="display:flex; flex-direction: column; align-items: center;">
        <p>${result ? 'Success conformation' : 'Can not confirm email'}</p>
        <a href="https://taskview.handscream.com/">TaskView</a>
    </div>
</div>
</body>
</html>
`;
        return res.send(html);
    };

    canSendRemindEmail(user: UserDbRecord): boolean {
        const REMIND_PASSWORD_INTERVAL = 1; //in minutes

        if (!user.remind_password_code && !user.remind_password_time) {
            return true;
        }

        if (user.remind_password_code && user.remind_password_time) {
            return user.remind_password_time + REMIND_PASSWORD_INTERVAL * 60 < Math.floor(Date.now() / 1000);
        }

        return false;
    }

    remindPassword = async (req: Request, res: Response) => {
        const data = RemindPasswordSchema.safeParse(req.body);

        if (!data.success) {
            return res.status(400).send();
        }

        // Always respond 200 to avoid user-enumeration. SMTP send runs in background,
        // so the response never races the browser preflight/timeout.
        const respond = () => res.status(200).send({ sent: true });

        const userData = await req.appUser.authManager.repository.getUserByLogin(data.data.email, true);
        if (!userData || !this.canSendRemindEmail(userData)) {
            return respond();
        }

        const code = generateString(18);
        const seconds = time();

        const result = await req.appUser.authManager.repository.setReminderCodeAndTime(userData.email, code, seconds);
        if (!result) {
            $logger.error('Can not set remind_code and time for user');
            return respond();
        }

        const remindPasswordUrl = `${process.env.APP_URL}/login/?resetCode=${code}&login=${userData.login}`;
        const remindPasswordBody = `<html>
                                    <body>
                                        <p><a href="${remindPasswordUrl}"> Reset password link! </a></p>
                                        <p>The link expires in 15 minutes.</p>
                                    </body>
                                    </html>`;

        Email.send({
            text: null,
            to: userData.email,
            subject: 'Remind password!',
            from: process.env.SMTP_FROM_EMAIL as string,
            attachment: [{ data: remindPasswordBody, alternative: true }],
        })
            .then((ok) => {
                if (!ok) $logger.error({ to: userData.email }, 'Failed to send remind password email');
            })
            .catch((err) => $logger.error({ err, to: userData.email }, 'Failed to send remind password email'));

        return respond();
    };

    changeRemindedPassword = async (req: Request, res: Response) => {
        const parsedData = ChangePasswordDataScheme.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).send();
        }

        // Unknown login, wrong, used and expired codes answer alike, so the reason never hints at a valid code
        const invalidCode = () => res.status(400).send({ reason: 'invalid_or_expired_code' });

        const userData = await req.appUser.authManager.repository.getUserByLogin(parsedData.data.login);

        if (!userData) {
            return invalidCode();
        }

        if (!userData.remind_password_code || !safeEqual(userData.remind_password_code, parsedData.data.code)) {
            return invalidCode();
        }

        if (parsedData.data.password !== parsedData.data.passwordRepeat) {
            return res.status(400).send();
        }

        // Same lifetime as the password-change code: the column is shared by both flows
        const consumed = await req.appUser.authManager.repository.consumeReminderCode({
            userId: userData.id,
            code: parsedData.data.code,
            issuedAfter: Math.floor(Date.now() / 1000) - PASSWORD_CHANGE_CODE_TTL_S,
        });
        if (!consumed) {
            return invalidCode();
        }

        const passwordHash = hashSync(parsedData.data.password, 10);

        const result = await req.appUser.authManager.repository.updateUserPassword(passwordHash, userData.id);

        $logger.debug(`Update result ${result}`);
        if (!result) {
            return res.status(500).send();
        }

        // A reset is account recovery: every session ends, including any held by whoever had access before
        await req.appUser.authManager.sessionStorage.deleteAllSessions(userData.id);
        this.clearRefreshToken(res);

        return res.status(200).send({ reset: true });
    };

    logout = async (req: Request, res: Response) => {
        this.clearRefreshToken(res);

        const sessionId = req.appUser.getTokenId();
        const userId = req.appUser.getUserData()?.id;

        if (!sessionId || !userId) {
            return res.status(401).send({ message: 'Unauthorized' });
        }

        const deleteResult = await req.appUser.authManager.sessionStorage.deleteSession(sessionId, userId);

        if (!deleteResult) {
            return res.status(500).send({ message: 'Failed to delete session' });
        }

        return res.status(204).end();
    };

    refreshTokens = async (req: Request, res: Response) => {
        const cookieToken: string | undefined = req.cookies[this.refreshTokenCookieName] || undefined;
        const bodyData = RefreshTokenSchema.safeParse(req.body);
        const bodyToken = bodyData.success && bodyData.data.refreshToken ? bodyData.data.refreshToken : undefined;

        if (!cookieToken && !bodyToken) {
            return res.status(400).send({ message: 'Invalid refresh token' });
        }

        const cookiePayload = cookieToken ? await AuthController.validateTokens({ token: cookieToken, type: 'refresh' }) : undefined;
        const bodyPayload = bodyToken ? await AuthController.validateTokens({ token: bodyToken, type: 'refresh' }) : undefined;
        const payload = cookiePayload ?? bodyPayload;
        $logger.info(
            `Refresh token source: ${cookiePayload ? 'cookie' : bodyPayload ? 'body' : 'none valid'}` +
            ` (cookie: ${cookieToken ? 'yes' : 'no'}, body: ${bodyToken ? 'yes' : 'no'})`
        );

        if (!payload) {
            this.clearRefreshToken(res);
            return res.status(400).end();
        }

        const isActive = await req.appUser.authManager.sessionStorage.isSessionActive(payload.id);
        if (!isActive) {
            this.clearRefreshToken(res);
            return res.status(401).end();
        }

        const newTokens = this.getTokens(payload);

        await req.appUser.authManager.sessionStorage.updateLastUsed(payload.id);

        await this.setRefreshToken(res, newTokens.refresh);

        if (bodyPayload?.id === payload.id) return res.json(newTokens);
        const { refresh: _refresh, ...withoutRefresh } = newTokens;
        return res.json(withoutRefresh);
    };

    getLoginOptions = async (_req: Request, res: Response) => {
        return res.status(200).send({
            magicLink: LoginMethods.isEnabled('magic-link'),
            password: LoginMethods.isEnabled('password'),
            sso: LoginMethods.isEnabled('sso'),
            socialProviders: LoginMethods.availableSocialProviders(),
            publicRegistration: LoginMethods.publicRegistrationAllowed(),
        });
    };

    private canCreateAccount = async (req: Request, email: string): Promise<boolean> => {
        if (LoginMethods.publicRegistrationAllowed()) return true;
        return await req.appUser.authManager.repository.isEmailInvited(email);
    };

    private passwordChangeConfirmationMode(): PasswordChangeConfirmationMode {
        return process.env.PASSWORD_CHANGE_CONFIRMATION === 'password' ? 'password' : 'email';
    }

    getPasswordChangeMode = async (_req: Request, res: Response) => {
        return res.status(200).send({ mode: this.passwordChangeConfirmationMode() });
    };

    sendPasswordChangeCode = async (req: Request, res: Response) => {
        if (this.passwordChangeConfirmationMode() !== 'email') {
            return res.status(403).send();
        }

        const userEmail = req.appUser.getUserData()?.email;
        if (!userEmail) {
            return res.status(400).end();
        }

        const userData = await req.appUser.authManager.repository.getUserByLogin(userEmail, true);
        if (!userData) {
            return res.status(400).end();
        }

        const now = Math.floor(Date.now() / 1000);
        const sinceLastCode = userData.remind_password_time ? now - userData.remind_password_time : null;
        if (sinceLastCode !== null && sinceLastCode < PASSWORD_CHANGE_CODE_RESEND_COOLDOWN_S) {
            return res.status(429).send({
                message: 'Please wait before requesting another code.',
                retryAfter: PASSWORD_CHANGE_CODE_RESEND_COOLDOWN_S - sinceLastCode,
            });
        }

        // High-entropy code: the shared remind_password_code column is also redeemable
        // via the unauthenticated /password/reset endpoint, so a short numeric code
        // would be brute-forceable there.
        const code = generateString(12);
        const saved = await req.appUser.authManager.repository.setReminderCodeAndTime(userEmail, code, now);
        if (!saved) {
            $logger.error(`Can not save password change code for user ${userData.id}`);
            return res.status(500).end();
        }

        const text = `Your TaskView password change code is ${code}\n\nUse this code to confirm your new password. The code expires in 15 minutes.\n\nIf you didn't request this change, ignore this email.`;

        Email.send({
            text,
            to: userEmail,
            subject: `Your TaskView password change code: ${code}`,
            from: process.env.SMTP_FROM_EMAIL as string,
        })
            .then((ok) => {
                if (!ok) $logger.error({ to: userEmail }, 'Failed to send password change code email');
            })
            .catch((err) => $logger.error({ err, to: userEmail }, 'Failed to send password change code email'));

        return res.status(200).end();
    };

    changeOwnPassword = async (req: Request, res: Response) => {
        const userEmail = req.appUser.getUserData()?.email;
        if (!userEmail) {
            return res.status(400).end();
        }

        const userData = await req.appUser.authManager.repository.getUserByLogin(userEmail, true);
        if (!userData) {
            return res.status(400).send();
        }

        if (this.passwordChangeConfirmationMode() === 'password') {
            const parsedData = ChangeOwnPasswordByPasswordSchema.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).send();
            }

            const validPassword = await this.comparePasswords(parsedData.data.currentPassword, userData.password);
            if (!validPassword) {
                return res.status(403).send({ field: 'currentPassword' });
            }

            return this.applyNewPassword(res, req, userData.id, parsedData.data.password);
        }

        const parsedData = ChangeOwnPasswordSchema.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).send();
        }

        if (!userData.remind_password_code || !userData.remind_password_time) {
            return res.status(400).send();
        }

        const now = Math.floor(Date.now() / 1000);
        if (now > userData.remind_password_time + PASSWORD_CHANGE_CODE_TTL_S) {
            return res.status(400).send();
        }

        if (userData.remind_password_code !== parsedData.data.code) {
            return res.status(400).send();
        }

        await req.appUser.authManager.repository.setReminderCodeAndTime(userEmail, null, null);

        return this.applyNewPassword(res, req, userData.id, parsedData.data.password);
    };

    private async applyNewPassword(res: Response, req: Request, userId: number, newPassword: string) {
        const passwordHash = hashSync(newPassword, 10);
        const result = await req.appUser.authManager.repository.updateUserPassword(passwordHash, userId);
        if (!result) {
            $logger.error(`Can not update password for user ${userId}`);
            return res.status(500).send();
        }

        const currentSessionId = req.appUser.getTokenId();
        await req.appUser.authManager.sessionStorage.deleteAllSessions(userId, currentSessionId);

        return res.status(200).send({ changed: true });
    }

    changeDefaultUserCredentials = async (req: Request, res: Response) => {
        const parsedData = ChangeDefaultUserCredentialsSchema.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).send();
        }

        const userEmail = req.appUser.getUserData()?.email;
        if (!userEmail) {
            return res.status(400).end();
        }

        const userData = await req.appUser.authManager.repository.getUserByLogin(userEmail, true);
        if (!userData || userData.email.toLowerCase() !== DEFAULT_USER_EMAIL) {
            return res.status(403).send();
        }

        const validPassword = await this.comparePasswords(parsedData.data.currentPassword, userData.password);
        if (!validPassword) {
            return res.status(403).send({ field: 'currentPassword' });
        }

        const { login, email } = parsedData.data;

        if (login !== userData.login && (await req.appUser.authManager.repository.getUserByLogin(login))) {
            return res.status(409).send({ field: 'login' });
        }
        if (email !== userData.email && (await req.appUser.authManager.repository.getUserByLogin(email, true))) {
            return res.status(409).send({ field: 'email' });
        }

        const updated = await req.appUser.authManager.repository.updateUserCredentials({
            userId: userData.id,
            oldEmail: userData.email,
            login,
            email,
            passwordHash: hashSync(parsedData.data.password, 10),
        });
        if (updated === 'conflict') {
            return res.status(409).send({ field: 'email' });
        }
        if (updated !== 'ok') {
            return res.status(500).send();
        }

        // JWTs carry login/email and refresh does not re-read them from the DB,
        // so drop every session and make the user sign in with the new credentials.
        await req.appUser.authManager.sessionStorage.deleteAllSessions(userData.id);
        this.clearRefreshToken(res);

        return res.status(200).send({ changed: true });
    };

    sendDeleteAccountCode = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        const userEmail = req.appUser.getUserData()?.email;
        if (!userId || !userEmail) {
            return res.status(400).end();
        }

        const code = generateString(12);

        // Saved before sending, so the emailed code is never one the server does not know
        const insertCode = await req.appUser.authManager.repository.addDeleteAccountCode({ code, userId });
        if (!insertCode) {
            $logger.error(`Can not insert account deletion code for user`);
            return res.status(500).end();
        }

        const sendResult = await Email.send({
            text: `Your TaskView account deletion code is ${code}\n\nThe code expires in 15 minutes.\n\nIf you didn't request this, ignore this email and consider changing your password.`,
            to: userEmail,
            subject: 'Account deletion code',
            from: process.env.SMTP_FROM_EMAIL as string,
        });

        if (!sendResult) {
            $logger.error(`Can not send account deletion code for user`);
        }
        return res.status(200).end();
    };

    getAccountDeletionOptions = async (_req: Request, res: Response) => {
        return res.status(200).send({ allowed: AccountDeletion.allowed() });
    };

    deleteUserAccaunt = async (req: Request, res: Response) => {
        const invalidCode = () => res.status(400).send({ reason: 'invalid_or_expired_code' });

        const parsed = DeleteAccountSchema.safeParse(req.body);
        if (!parsed.success) {
            return invalidCode();
        }
        const userId = req.appUser.getUserData()?.id;
        if (!userId) {
            $logger.fatal(`Request for account deletion without userId in request`);
            return res.status(400).end();
        }

        const deleted = await req.appUser.authManager.repository.deleteAccountByCode({
            userId,
            code: parsed.data.code,
            ttlSeconds: AccountDeletion.CODE_TTL_S,
        });
        if (!deleted) {
            return invalidCode();
        }
        return res.tvJson({ del: true });
    };
}
