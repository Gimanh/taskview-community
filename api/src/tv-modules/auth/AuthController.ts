import { compare, hashSync } from 'bcryptjs';
import { randomInt } from 'crypto';
import type { Request, Response } from 'express';
import jwt, { type Algorithm, decode } from 'jsonwebtoken';
import { z } from 'zod';
import { Email } from '../../core/Email';
import { $logger } from '../../modules/logget';
import {
    ChangePasswordDataScheme,
    ConfirmEmailReqDataSchema,
    RefreshTokenSchema,
    RemindPasswordSchema,
    type UserDbRecord,
    type UserJwtPayload,
    UserJwtPayloadSchema,
} from '../../types/auth.types';
import { generateString, isEmail, time } from '../../utils/helpers';
import EnEmailTemplate from './mail/confirm-email-en';
import RuEmailTemplate from './mail/confirm-email-ru';
import LoginCodeEmailTemplate from './mail/login-code-en';
import type { ExternalAuthUser } from './strategies/external-auth.types';
import { OrganizationRepository } from '../organizations/OrganizationRepository';
import { GoalsRepository } from '../goals/GoalsRepository';

const LOGIN_CODE_TTL_MS = 5 * 60 * 1000;

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

        //@ts-expect-error 
        const access = jwt.sign(cleanPayload.data!, process.env.JWT_SIGN as string, {
            algorithm: this.jwtAlg,
            expiresIn: this.jwtExp,
        });

        //@ts-expect-error 
        const refresh = jwt.sign(cleanPayload.data!, process.env.JWT_SIGN as string, {
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

    static validateTokens(token: string): Promise<UserJwtPayload | undefined> {
        return new Promise((resolve) => {
            jwt.verify(
                token,
                process.env.JWT_SIGN as string,
                { algorithms: [process.env.JWT_ALG as Algorithm] },
                (err, payload) => {
                    if (err) {
                        // console.log('Can not verify token', err)
                        resolve(undefined);
                    } else {
                        resolve(payload as UserJwtPayload);
                    }
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

        let userData = await req.appUser.authManager.repository.getUserByLogin(
            user.email,
            isEmail(user.email)
        );

        if (!userData) {
            const password = this.makeidLogin(7);
            const login = this.makeidLogin(7);

            const id = await req.appUser.authManager.repository.registerUserInDb({
                login,
                email: user.email,
                password: hashSync(password, 10),
                block: 0,
                confirmEmailCode: '',
            });

            if (!id) {
                $logger.error(`Can not register user`);
                return res.status(500).send(`Can not register user`);
            }

            await this.createPersonalWorkspace(id, user.email, login)

            userData = await req.appUser.authManager.repository.getUserByLogin(
                user.email,
                isEmail(user.email)
            );
        }

        if (!userData) {
            $logger.error(`Can not find user after registration`);
            return res.status(500).send(`Can not find user ${user.email} after registration`);
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
            sameSite: "none",
            maxAge: this.parseLifetimeToMs(this.jwtRefreshExp),
        });
    }

    clearRefreshToken = (res: Response) => {
        res.clearCookie(this.refreshTokenCookieName, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
    }

    loginByCode = async (req: Request, res: Response) => {
        const schema = z.object({
            email: z.string().trim().email().toLowerCase(),
            code: z.string().trim().regex(/^\d{6}$/, '6-digit code'),
        });

        const data = schema.safeParse(req.body);
        if (!data.success) {
            return res.status(400).end();
        }

        const userData = await req.appUser.authManager.repository.getUserByLogin(
            data.data.email,
            isEmail(data.data.email)
        );

        if (!userData || !userData.remember_token?.trim()) {
            return res.status(400).end();
        }

        const tokenFromDb = userData.remember_token?.split(':');

        if (tokenFromDb?.length !== 2) {
            return res.status(400).end();
        }

        if (tokenFromDb[0] !== data.data.code) {
            return res.status(400).send({ message: 'Invalid code' });
        }

        if (tokenFromDb[1] && Date.now() - +tokenFromDb[1] > LOGIN_CODE_TTL_MS) {
            await req.appUser.authManager.repository.updateLoginCode(null, userData.email);
            return res.status(400).send({ message: 'Code expired, get new code' });
        }

        // Invalidate code immediately to prevent replay attacks
        await req.appUser.authManager.repository.updateLoginCode(null, userData.email);

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

        const userData = await req.appUser.authManager.repository.getUserByLogin(parsedData.data.login);

        if (!userData) {
            return res.status(400).send();
        }

        if (userData.remind_password_code !== parsedData.data.code) {
            return res.status(400).send();
        }

        if (parsedData.data.password !== parsedData.data.passwordRepeat) {
            return res.status(400).send();
        }

        const passwordHash = hashSync(parsedData.data.password, 10);

        const result = await req.appUser.authManager.repository.updateUserPassword(passwordHash, userData.id);

        $logger.debug(`Update result ${result}`);
        if (!result) {
            return res.status(500).send();
        }

        await req.appUser.authManager.repository.setReminderCodeAndTime(userData.email, null, null);

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
        let refreshToken = req.cookies[this.refreshTokenCookieName];

        if (!refreshToken) {
            const refreshData = RefreshTokenSchema.safeParse(req.body);

            if (!refreshData.success) {
                return res.status(400).send({ message: 'Invalid refresh token' });
            }

            refreshToken = refreshData.data.refreshToken;
            $logger.info(`Refresh token found in body`);
        } else {
            $logger.info(`Refresh token found in cookies`);
        }

        const payload = await AuthController.validateTokens(refreshToken);

        if (!payload) {
            $logger.info('Refresh token validation failed');
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

        return res.json(newTokens);
    };

    sendDeleteAccountCode = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        const userEmail = req.appUser.getUserData()?.email;
        if (!userId || !userEmail) {
            return res.status(400).end();
        }

        const code = generateString(12);

        const sendResult = await Email.send({
            text: code,
            to: userEmail, //'gimanhead@gmail.com',
            subject: 'Account deletion code!',
            from: process.env.SMTP_FROM_EMAIL as string,
        });

        if (!sendResult) {
            $logger.error(`Can not send account deletion code for user`);
        }
        const insertCode = await req.appUser.authManager.repository.addDeleteAccountCode(code, userId);

        if (!insertCode) {
            $logger.error(`Can not insert account deletion code for user`);
            return res.status(500).end();
        }
        return res.status(200).end();
    };

    deleteUserAccaunt = async (req: Request, res: Response) => {
        const { code } = req.body;
        const userId = req.appUser.getUserData()?.id;
        if (!userId) {
            $logger.fatal(`Request for account deletion without userId in request`);
            return res.status(400).end();
        }

        const deleteResult = await req.appUser.authManager.repository.deleteUserAccount(code, userId);

        if (!deleteResult) {
            $logger.error(`Can not delete user account for code ${code}`);
            return res.status(500).end();
        }
        return res.status(200).end();
    };
}
