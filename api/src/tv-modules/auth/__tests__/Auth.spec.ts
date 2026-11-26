import axios from 'axios';
import type http from 'http';
import { type Algorithm, decode, sign } from 'jsonwebtoken';
import { hashSync } from 'bcryptjs';
import { createHash } from 'crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import type { UserJwtPayload } from '../../../types/auth.types';
import { delay } from '../../../utils/helpers';
import AuthModel from '../AuthModel';
import JwtStorage from '../SessionStorage';

const port = 1809;
const url = `http://localhost:${port}`;

let server: http.Server;
let deleteTestUserEmail: string = '';
const registeredEmails: string[] = [];

describe('Login API', () => {
    vi.mock('emailjs', () => ({
        SMTPClient: vi.fn().mockImplementation(() => ({
            sendAsync: vi.fn().mockResolvedValue(true),
        })),
    }));

    vi.mock('../../core/Email', () => ({
        Email: {
            send: vi.fn().mockResolvedValue(true), // Мокаем успешную отправку письма
        },
    }));

    beforeAll(() => {
        // Account deletion is off unless the instance opts in
        vi.stubEnv('ALLOW_ACCOUNT_DELETION', 'true');
        server = new App(port).listen();
    });

    afterAll(async () => {
        server.close();
        vi.unstubAllEnvs();
        const db = Database.getInstance();
        // Only this file's users: auth specs run in parallel against one database
        if (registeredEmails.length) {
            await db.query('delete from tv_auth.users where email = any($1::text[])', [registeredEmails]);
        }
    });

    it('should send a login request and receive a tokens', async () => {
        const username = 'test@mail.dest';
        const password = 'user1!#Q';

        const response = await axios.post(`${url}/module/auth/login`, {
            login: username,
            password: password,
        });

        expect(response.data).toHaveProperty('access');
        expect(response.data).toHaveProperty('refresh');
        expect(response.data).toHaveProperty('type');
        expect(response.data).toHaveProperty('userData');
        expect(response.data.type).toBe('jwt');

        const payloadAccess = decode(response.data.access) as UserJwtPayload;

        expect(payloadAccess as any).toHaveProperty('id');
        expect(payloadAccess as any).toHaveProperty('userData');
        expect((payloadAccess as any).userData).toHaveProperty('id');
        expect((payloadAccess as any).userData).toHaveProperty('login');
        expect((payloadAccess as any).userData).toHaveProperty('email');

        const payloadRefresh = decode(response.data.refresh) as UserJwtPayload;

        expect(payloadRefresh as any).toHaveProperty('id');
        expect(payloadRefresh as any).toHaveProperty('userData');
        expect((payloadRefresh as any).userData).toHaveProperty('id');
        expect((payloadRefresh as any).userData).toHaveProperty('login');
        expect((payloadRefresh as any).userData).toHaveProperty('email');

        const sessionStorage = new JwtStorage();
        const isActive = await sessionStorage.isSessionActive(payloadRefresh.id);
        expect(isActive).toBe(true);
    });

    it('Registration', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        const response = await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        expect(response.data).toHaveProperty('registration');
        expect(response.data).toHaveProperty('confirmEmail');

        expect(response.data.registration).toBe(true);
        expect(response.data.confirmEmail).toBe(true);
    });

    it('confirmEmail', async () => {
        const userModel = new AuthModel();

        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userData = await userModel.getUserByLogin(email, true);

        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }
    });

    it('remindPassword', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const response = await axios.post(`${url}/module/auth/email/recovery`, { email }).catch((err) => {
            throw new Error(err);
        });

        expect(response.status).toBe(200);
    });

    it('changeRemindedPassword', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const response1 = await axios.post(`${url}/module/auth/email/recovery`, { email }).catch((err) => {
            throw new Error(err);
        });

        expect(response1.status).toBe(200);

        const userModel = new AuthModel();

        const userData = await userModel.getUserByLogin(email, true);
        if (!userData) {
            throw new Error('Can not get user data');
        }

        await axios
            .post(`${url}/module/auth/password/reset`, {
                login: userData.login,
                code: userData.remind_password_code,
                password: '1234567',
                passwordRepeat: '12345678',
            })
            .catch((err) => expect(err.status).toBe(400));

        const response3 = await axios.post(`${url}/module/auth/password/reset`, {
            login: userData.login,
            code: userData.remind_password_code,
            password: '1234567',
            passwordRepeat: '1234567',
        });
        expect(response3.status).toBe(200);
    });

    it('logout', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userModel = new AuthModel();
        const userData = await userModel.getUserByLogin(email, true);

        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }

        const response = await axios.post(`${url}/module/auth/login`, {
            login: email,
            password: password,
        });

        const response3 = await axios.post(
            `${url}/module/auth/logout`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${response.data.access}`,
                },
            }
        );

        expect(response3.status).toBe(204);
    });

    it('logout without token', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userModel = new AuthModel();
        const userData = await userModel.getUserByLogin(email, true);

        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }

        const response = await axios.post(`${url}/module/auth/login`, {
            login: email,
            password: password,
        });

        const response3 = await axios
            .post(
                `${url}/module/auth/logout`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${response.data.access}4234`,
                    },
                }
            )
            .catch((err) => {
                expect(err.status).toBe(401);
            });

        expect(response3).toBeFalsy();
    });

    it('refreshToken', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userModel = new AuthModel();
        const userData = await userModel.getUserByLogin(email, true);

        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }

        const responseLogin = await axios.post(`${url}/module/auth/login`, {
            login: email,
            password: password,
        });

        const response = await axios.post(`${url}/module/auth/refresh/token`, {
            refreshToken: responseLogin.data.refresh,
        });

        expect(response.status).toBe(200);
        expect(response.data.access).toBeTruthy();
        expect(response.data.refresh).toBeTruthy();
        expect(response.data.userData).toBeTruthy();

        await delay(3000);

        try {
            const responseExp = await axios.post(`${url}/module/auth/refresh/token`, {
                refreshToken: responseLogin.data.refresh,
            });
            expect(responseExp).toBeFalsy();
        } catch (err: any) {
            expect(err.status).toBe(400);
        }
    });

    it('Send delete code to email', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userModel = new AuthModel();
        const userData = await userModel.getUserByLogin(email, true);

        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }

        const response = await axios.post(`${url}/module/auth/login`, {
            login: email,
            password: password,
        });

        const response3 = await axios.post(
            `${url}/module/auth/delete/account/code`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${response.data.access}`,
                },
            }
        );

        expect(response3.status).toBe(200);
    });

    it('Send delete code to email NO AUTH', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userModel = new AuthModel();
        const userData = await userModel.getUserByLogin(email, true);

        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }

        await axios.post(`${url}/module/auth/login`, {
            login: email,
            password: password,
        });

        let te = 1;
        await axios.post(`${url}/module/auth/delete/account/code`, {}).catch((err) => {
            te = 0;
            expect(err.status).toBe(401);
        });

        expect(te).toBe(0);
    });

    it('Account deletion', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userModel = new AuthModel();
        const userData = await userModel.getUserByLogin(email, true);
        if (!userData) {
            throw new Error('Can not get user data');
        }
        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }

        const response = await axios.post(`${url}/module/auth/login`, {
            login: email,
            password: password,
        });

        await axios.post(
            `${url}/module/auth/delete/account/code`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${response.data.access}`,
                },
            }
        );

        const db = Database.getInstance();

        const data = await db.query('select code from tv_auth.account_deletion where user_id = $1', [userData.id]);

        if (data.rows.length === 0) {
            throw new Error('Can not fetch user code from db');
        }

        const response3 = await axios.post(
            `${url}/module/auth/delete/account`,
            { code: data.rows[0].code },
            {
                headers: {
                    Authorization: `Bearer ${response.data.access}`,
                },
            }
        );

        expect(response3.status).toBe(200);

        const userData2 = await userModel.getUserByLogin(email, true);
        expect(userData2).toBeFalsy();
    });

    it('Account deletion NO AUTH', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;
        const password = 'user1!#Q';
        const passwordRepeat = 'user1!#Q';

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password,
            passwordRepeat,
        });

        const userModel = new AuthModel();
        const userData = await userModel.getUserByLogin(email, true);
        if (!userData) {
            throw new Error('Can not get user data');
        }
        if (userData) {
            const u = `${url}/module/auth/confirm/email/${userData.confirm_email_code}/login/${userData.login}`;
            const response = await axios.get<string>(u).catch((err) => {
                throw new Error(err);
            });
            expect(typeof response.data).toBe('string');
        }

        const response = await axios.post(`${url}/module/auth/login`, {
            login: email,
            password: password,
        });

        await axios.post(
            `${url}/module/auth/delete/account/code`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${response.data.access}`,
                },
            }
        );

        const db = Database.getInstance();

        const data = await db.query('select code from tv_auth.account_deletion where user_id = $1', [userData.id]);

        if (data.rows.length === 0) {
            throw new Error('Can not fetch user code from db');
        }
        let te = 1;
        await axios.post(`${url}/module/auth/delete/account`, { code: data.rows[0].code }, {}).catch((err) => {
            te = 0;
            expect(err.status).toBe(401);
        });

        expect(te).toBe(0);
    });

    it('loginByCode confirms and admits a blocked-unconfirmed account', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password: 'user1!#Q',
            passwordRepeat: 'user1!#Q',
        });

        const userModel = new AuthModel();
        const before = await userModel.getUserByLogin(email, true);
        expect(before).toBeTruthy();
        expect((before as any).block).toBe(1);
        expect((before as any).confirm_email_code).toBeTruthy();

        const code = '654321';
        await userModel.updateLoginCode(`${code}:${Date.now()}`, email);

        const response = await axios.post(`${url}/module/auth/login-by-code`, { email, code });

        expect(response.status).toBe(200);
        expect(response.data.access).toBeTruthy();
        expect(response.data.refresh).toBeTruthy();

        const after = await userModel.getUserByLogin(email, true);
        expect((after as any).block).toBe(0);
        expect((after as any).confirm_email_code).toBeNull();
    });

    it('loginByCode rejects a banned account (blocked, no confirm code)', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
        registeredEmails.push(deleteTestUserEmail);
        const email = deleteTestUserEmail;

        await axios.post(`${url}/module/auth/registration`, {
            email,
            password: 'user1!#Q',
            passwordRepeat: 'user1!#Q',
        });

        const db = Database.getInstance();
        await db.query('update tv_auth.users set block = 1, confirm_email_code = null where email = $1', [email]);

        const userModel = new AuthModel();
        const code = '112233';
        await userModel.updateLoginCode(`${code}:${Date.now()}`, email);

        let status = 0;
        let message = '';
        await axios.post(`${url}/module/auth/login-by-code`, { email, code }).catch((err) => {
            status = err.response.status;
            message = err.response.data.message;
        });

        expect(status).toBe(403);
        expect(message).toBe('account_blocked');

        const after = await userModel.getUserByLogin(email, true);
        expect((after as any).block).toBe(1);
    });
    describe('refresh token hardening (GHSA-p7h5-m7pj-2vq3)', () => {
        const login = () =>
            axios.post(`${url}/module/auth/login`, { login: 'test@mail.dest', password: 'user1!#Q' });
        const csrfOf = (session: { data: { csrf: string } }) => ({ 'X-CSRF-Token': session.data.csrf });
        const refreshCookieFrom = (setCookie: string[] | undefined) => {
            const cookie = (setCookie ?? []).find((c) => /refresh/i.test(c.split('=')[0]));
            expect(cookie).toBeTruthy();
            return cookie as string;
        };

        it('does not grant CORS access to the opaque "null" origin', async () => {
            const preflight = await axios.options(`${url}/module/auth/refresh/token`, {
                headers: { Origin: 'null', 'Access-Control-Request-Method': 'POST' },
                validateStatus: () => true,
            });
            expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
            expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();

            const post = await axios.post(`${url}/module/auth/refresh/token`, {}, {
                headers: { Origin: 'null' },
                validateStatus: () => true,
            });
            expect(post.headers['access-control-allow-origin']).toBeUndefined();
        });

        it('does not serve tokens to a "null" origin request that carries a valid refresh cookie (issue #154)', async () => {
            const cookie = refreshCookieFrom((await login()).headers['set-cookie']).split(';')[0];

            const response = await axios.post(`${url}/module/auth/refresh/token`, {}, {
                headers: { Origin: 'null', Cookie: cookie },
                validateStatus: () => true,
            });

            expect(response.status).not.toBe(200);
            expect(response.headers['access-control-allow-origin']).toBeUndefined();
            expect(response.headers['access-control-allow-credentials']).toBeUndefined();
            expect(response.headers['set-cookie']).toBeUndefined();
            expect(response.data).not.toHaveProperty('access');
            expect(response.data).not.toHaveProperty('refresh');
        });

        it('does not emit Access-Control-Allow-Origin when the Origin header is absent', async () => {
            const session = await login();
            const cookie = refreshCookieFrom(session.headers['set-cookie']).split(';')[0];

            const response = await axios.post(`${url}/module/auth/refresh/token`, {}, { headers: { Cookie: cookie, ...csrfOf(session) } });

            expect(response.headers['access-control-allow-origin']).toBeUndefined();
        });

        it('still grants CORS access to an allowed origin', async () => {
            const preflight = await axios.options(`${url}/module/auth/refresh/token`, {
                headers: { Origin: 'https://app.taskview.tech', 'Access-Control-Request-Method': 'POST' },
                validateStatus: () => true,
            });
            expect(preflight.headers['access-control-allow-origin']).toBe('https://app.taskview.tech');
            expect(preflight.headers['access-control-allow-credentials']).toBe('true');
        });

        it('sets the refresh cookie HttpOnly, Secure and SameSite=Lax', async () => {
            const cookie = refreshCookieFrom((await login()).headers['set-cookie']);
            expect(cookie).toMatch(/HttpOnly/i);
            expect(cookie).toMatch(/Secure/i);
            expect(cookie).toMatch(/SameSite=Lax/i);
            expect(cookie).not.toMatch(/SameSite=None/i);
        });

        it('does not return the refresh token in the body when refreshing by cookie only', async () => {
            const session = await login();
            const cookie = refreshCookieFrom(session.headers['set-cookie']).split(';')[0];

            const response = await axios.post(`${url}/module/auth/refresh/token`, {}, { headers: { Cookie: cookie, ...csrfOf(session) } });

            expect(response.status).toBe(200);
            expect(response.data.access).toBeTruthy();
            expect(response.data).not.toHaveProperty('refresh');
            expect(refreshCookieFrom(response.headers['set-cookie'])).toMatch(/SameSite=Lax/i);
        });

        it('returns a new pair to a client that sends its stored token in the body alongside the cookie', async () => {
            const loginResponse = await login();
            const cookie = refreshCookieFrom(loginResponse.headers['set-cookie']).split(';')[0];

            const response = await axios.post(
                `${url}/module/auth/refresh/token`,
                { refreshToken: loginResponse.data.refresh },
                { headers: { Cookie: cookie } },
            );

            expect(response.status).toBe(200);
            expect(response.data.access).toBeTruthy();
            expect(response.data.refresh).toBeTruthy();
        });

        it('does not return the refresh token when the body carries an invalid token next to a valid cookie', async () => {
            const session = await login();
            const cookie = refreshCookieFrom(session.headers['set-cookie']).split(';')[0];

            const response = await axios.post(
                `${url}/module/auth/refresh/token`,
                { refreshToken: 'not-a-token' },
                { headers: { Cookie: cookie, ...csrfOf(session) } },
            );

            expect(response.status).toBe(200);
            expect(response.data.access).toBeTruthy();
            expect(response.data).not.toHaveProperty('refresh');
        });

        it('does not return the refresh token when the body token belongs to another session', async () => {
            const first = await login();
            const second = await login();
            const cookie = refreshCookieFrom(first.headers['set-cookie']).split(';')[0];

            const response = await axios.post(
                `${url}/module/auth/refresh/token`,
                { refreshToken: second.data.refresh },
                { headers: { Cookie: cookie, ...csrfOf(first) } },
            );

            expect(response.status).toBe(200);
            expect(response.data).not.toHaveProperty('refresh');
        });

        it('falls back to the body token when the cookie is invalid', async () => {
            const loginResponse = await login();

            const response = await axios.post(
                `${url}/module/auth/refresh/token`,
                { refreshToken: loginResponse.data.refresh },
                { headers: { Cookie: 'taskview-refresh=garbage' } },
            );

            expect(response.status).toBe(200);
            expect(response.data.refresh).toBeTruthy();
        });

        it('hands out a CSRF token of its own with every sign-in', async () => {
            const first = await login();
            const second = await login();

            expect(first.data.csrf).toMatch(/^[\w-]{43}$/);
            expect(second.data.csrf).toMatch(/^[\w-]{43}$/);
            expect(first.data.csrf).not.toBe(second.data.csrf);
        });

        it('does not keep the CSRF token itself in the database', async () => {
            const session = await login();
            const sessionId = (decode(session.data.refresh) as UserJwtPayload).id;

            const row = await Database.getInstance().query(
                'select csrf_token_hash from tv_auth.user_tokens where id = $1',
                [sessionId],
            );

            expect(row.rows[0].csrf_token_hash).toMatch(/^[0-9a-f]{64}$/);
            expect(row.rows[0].csrf_token_hash).not.toBe(session.data.csrf);
        });

        it('refuses a refresh by cookie alone without the CSRF token and leaves the refresh token unused', async () => {
            const session = await login();
            const cookie = refreshCookieFrom(session.headers['set-cookie']).split(';')[0];

            const refused = await axios.post(`${url}/module/auth/refresh/token`, {}, {
                headers: { Cookie: cookie },
                validateStatus: () => true,
            });

            expect(refused.status).toBe(403);
            expect(refused.data).toEqual({ message: 'csrf_token_invalid' });
            expect(refused.headers['set-cookie']).toBeUndefined();

            const allowed = await axios.post(`${url}/module/auth/refresh/token`, {}, { headers: { Cookie: cookie, ...csrfOf(session) } });
            expect(allowed.status).toBe(200);
            expect(allowed.data.access).toBeTruthy();
        });

        it('refuses a refresh by cookie alone with a CSRF token that is not the one of this session', async () => {
            const session = await login();
            const other = await login();
            const cookie = refreshCookieFrom(session.headers['set-cookie']).split(';')[0];
            const wrongTokens = [
                'XMLHttpRequest',
                `${session.data.csrf}x`,
                session.data.csrf.slice(0, -1),
                other.data.csrf,
            ];

            for (const token of wrongTokens) {
                const response = await axios.post(`${url}/module/auth/refresh/token`, {}, {
                    headers: { Cookie: cookie, 'X-CSRF-Token': token },
                    validateStatus: () => true,
                });
                expect(response.status, `token ${token}`).toBe(403);
                expect(response.data).not.toHaveProperty('access');
                expect(response.headers['set-cookie']).toBeUndefined();
            }

            const allowed = await axios.post(`${url}/module/auth/refresh/token`, {}, { headers: { Cookie: cookie, ...csrfOf(session) } });
            expect(allowed.status).toBe(200);
        });

        it('keeps accepting the CSRF token of the session after its refresh token was rotated', async () => {
            const session = await login();
            const cookie = refreshCookieFrom(session.headers['set-cookie']).split(';')[0];

            const first = await axios.post(`${url}/module/auth/refresh/token`, {}, { headers: { Cookie: cookie, ...csrfOf(session) } });
            const rotatedCookie = refreshCookieFrom(first.headers['set-cookie']).split(';')[0];
            const second = await axios.post(`${url}/module/auth/refresh/token`, {}, { headers: { Cookie: rotatedCookie, ...csrfOf(session) } });

            expect(first.data).not.toHaveProperty('csrf');
            expect(second.status).toBe(200);
        });

        it('asks for the CSRF token when the body token is not a token of the cookie session', async () => {
            const first = await login();
            const second = await login();
            const cookie = refreshCookieFrom(first.headers['set-cookie']).split(';')[0];

            for (const refreshToken of ['not-a-token', second.data.refresh]) {
                const response = await axios.post(
                    `${url}/module/auth/refresh/token`,
                    { refreshToken },
                    { headers: { Cookie: cookie }, validateStatus: () => true },
                );
                expect(response.status).toBe(403);
            }
        });

        it('needs no CSRF token from a client that sends its own refresh token in the body', async () => {
            const loginResponse = await login();
            const cookie = refreshCookieFrom(loginResponse.headers['set-cookie']).split(';')[0];

            const withCookie = await axios.post(
                `${url}/module/auth/refresh/token`,
                { refreshToken: loginResponse.data.refresh },
                { headers: { Cookie: cookie } },
            );
            const bodyOnly = await axios.post(`${url}/module/auth/refresh/token`, { refreshToken: withCookie.data.refresh });

            expect(withCookie.status).toBe(200);
            expect(bodyOnly.status).toBe(200);
        });

        it('rejects a refresh call with neither a body token nor a cookie', async () => {
            const response = await axios.post(`${url}/module/auth/refresh/token`, {}, { validateStatus: () => true });
            expect(response.status).toBe(400);
        });
    });

    describe('refresh token rotation', () => {
        const signIn = async () =>
            (await axios.post(`${url}/module/auth/login`, { login: 'test@mail.dest', password: 'user1!#Q' })).data;
        const refreshWith = (refreshToken: string) =>
            axios.post(`${url}/module/auth/refresh/token`, { refreshToken }, { validateStatus: () => true });
        const sessionsStatus = async (access: string) =>
            (await axios.get(`${url}/module/sessions`, {
                headers: { Authorization: `Bearer ${access}` },
                validateStatus: () => true,
            })).status;
        const claims = (token: string) => decode(token) as UserJwtPayload & { jti?: string };

        it('gives every refresh token its own id and replaces it on each refresh', async () => {
            const session = await signIn();
            const first = await refreshWith(session.refresh);
            const second = await refreshWith(first.data.refresh);

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            const ids = [session.refresh, first.data.refresh, second.data.refresh].map((token) => claims(token).jti);
            expect(ids.every(Boolean)).toBe(true);
            expect(new Set(ids).size).toBe(3);
            expect(claims(second.data.refresh).id).toBe(claims(session.refresh).id);
            expect(await sessionsStatus(second.data.access)).toBe(200);
        });

        it('answers the token replaced a moment ago with the current one instead of ending the session', async () => {
            const session = await signIn();
            const rotated = await refreshWith(session.refresh);

            const repeated = await refreshWith(session.refresh);

            expect(repeated.status).toBe(200);
            expect(claims(repeated.data.refresh).jti).toBe(claims(rotated.data.refresh).jti);
            expect((await refreshWith(rotated.data.refresh)).status).toBe(200);
        });

        it('lets two parallel refreshes with the same token end up on the same token', async () => {
            const session = await signIn();

            const [a, b] = await Promise.all([refreshWith(session.refresh), refreshWith(session.refresh)]);

            expect(a.status).toBe(200);
            expect(b.status).toBe(200);
            expect(claims(a.data.refresh).jti).toBe(claims(b.data.refresh).jti);
            expect(claims(a.data.refresh).jti).not.toBe(claims(session.refresh).jti);
        });

        it('ends the session for everyone when a token from two rotations back shows up', async () => {
            const session = await signIn();
            const first = await refreshWith(session.refresh);
            const second = await refreshWith(first.data.refresh);
            expect(await sessionsStatus(second.data.access)).toBe(200);

            const stale = await refreshWith(session.refresh);

            expect(stale.status).toBe(401);
            expect(stale.data).not.toHaveProperty('access');
            expect((stale.headers['set-cookie'] ?? []).join(';')).toMatch(/taskview-refresh=;/);
            expect((await refreshWith(second.data.refresh)).status).toBe(401);
            expect(await sessionsStatus(second.data.access)).toBe(401);
        });

        it('ends the session when the replaced token comes back after the short repeat window', async () => {
            const session = await signIn();
            const rotated = await refreshWith(session.refresh);
            await Database.getInstance().query(
                `update tv_auth.user_tokens set refresh_rotated_at = now() - interval '5 minutes' where id = $1`,
                [claims(session.refresh).id],
            );

            const late = await refreshWith(session.refresh);

            expect(late.status).toBe(401);
            expect((await refreshWith(rotated.data.refresh)).status).toBe(401);
            expect(await sessionsStatus(rotated.data.access)).toBe(401);
        });

        it('leaves other sessions of the same user alone when one of them is ended for reuse', async () => {
            const leaked = await signIn();
            const other = await signIn();
            const first = await refreshWith(leaked.refresh);
            await refreshWith(first.data.refresh);

            expect((await refreshWith(leaked.refresh)).status).toBe(401);

            expect(await sessionsStatus(other.access)).toBe(200);
            expect((await refreshWith(other.refresh)).status).toBe(200);
        });

        it('does not accept a refresh token without an id', async () => {
            const session = await signIn();
            const { id, userData } = claims(session.refresh);
            const withoutId = sign({ id, userData, typ: 'refresh' }, process.env.JWT_SIGN as string, {
                algorithm: process.env.JWT_ALG as Algorithm,
                expiresIn: '1m',
            });

            const response = await refreshWith(withoutId);

            expect(response.status).toBe(400);
            expect(response.data).not.toHaveProperty('access');
            expect(await sessionsStatus(session.access)).toBe(200);
        });

        it('does not rotate on a token whose session is gone', async () => {
            const session = await signIn();
            await Database.getInstance().query('delete from tv_auth.user_tokens where id = $1', [claims(session.refresh).id]);

            expect((await refreshWith(session.refresh)).status).toBe(401);
        });
    });

    describe('sign-in attempt limit', () => {
        const PASSWORD = 'right-Pa55word';
        // Rows counting this file's own address; LoginAttempts.spec.ts runs in parallel with made-up addresses
        const OWN_ADDRESS_ROWS = `key like 'ip:%' and key not like 'ip:test-address-%'`;
        const tryLogin = (login: string, password: string) =>
            axios.post(`${url}/module/auth/login`, { login, password }, { validateStatus: () => true });
        const ownAccount = async () => {
            const login = `limit${Date.now()}${Math.floor(Math.random() * 1e6)}`;
            const email = `${login}@mail.dest`;
            await new AuthModel().registerUserInDb({
                login,
                email,
                password: hashSync(PASSWORD, 4),
                confirmEmailCode: '',
                block: 0,
            });
            registeredEmails.push(email);
            return email;
        };

        beforeEach(async () => {
            vi.stubEnv('LOGIN_ATTEMPT_LIMIT', '3');
            // Every request of this file comes from the same address: start each test with a clean count for it
            await Database.getInstance().query(`delete from tv_auth.login_attempts where ${OWN_ADDRESS_ROWS}`);
        });

        afterEach(() => {
            vi.stubEnv('LOGIN_ATTEMPT_LIMIT', '');
        });

        it('pauses sign-in after the allowed number of wrong passwords, even for the right one', async () => {
            const email = await ownAccount();

            for (let i = 0; i < 3; i++) {
                expect((await tryLogin(email, 'wrong')).status).toBe(400);
            }
            const paused = await tryLogin(email, PASSWORD);

            expect(paused.status).toBe(429);
            expect(paused.data).toEqual({ message: 'too_many_attempts' });
            expect(Number(paused.headers['retry-after'])).toBeGreaterThan(0);
            expect(Number(paused.headers['retry-after'])).toBeLessThanOrEqual(15 * 60);
            expect(paused.data).not.toHaveProperty('access');
            expect(paused.headers['set-cookie']).toBeUndefined();
        });

        it('counts an unknown login the same way as a wrong password', async () => {
            const unknown = `nobody${Date.now()}@mail.dest`;

            for (let i = 0; i < 3; i++) {
                expect((await tryLogin(unknown, 'wrong')).status).toBe(400);
            }

            expect((await tryLogin(unknown, 'wrong')).status).toBe(429);
        });

        it('does not pause other accounts when one of them is paused', async () => {
            const paused = await ownAccount();
            const other = await ownAccount();
            for (let i = 0; i < 3; i++) await tryLogin(paused, 'wrong');
            expect((await tryLogin(paused, PASSWORD)).status).toBe(429);

            expect((await tryLogin(other, PASSWORD)).status).toBe(200);
        });

        it('starts counting anew after a successful sign-in', async () => {
            const email = await ownAccount();
            await tryLogin(email, 'wrong');
            await tryLogin(email, 'wrong');
            expect((await tryLogin(email, PASSWORD)).status).toBe(200);

            await tryLogin(email, 'wrong');
            await tryLogin(email, 'wrong');

            expect((await tryLogin(email, PASSWORD)).status).toBe(200);
        });

        it('lets the account in again once the window has passed', async () => {
            const email = await ownAccount();
            for (let i = 0; i < 3; i++) await tryLogin(email, 'wrong');
            expect((await tryLogin(email, PASSWORD)).status).toBe(429);

            // The paused row is keyed by a hash of the account and the address the server saw
            const db = Database.getInstance();
            const addresses = await db.query<{ key: string }>(`select key from tv_auth.login_attempts where ${OWN_ADDRESS_ROWS}`);
            const pausedKeys = addresses.rows.map(
                (row) => `pair:${createHash('sha256').update(`${email}|${row.key.slice('ip:'.length)}`).digest('hex')}`,
            );
            const expired = await db.query(
                `update tv_auth.login_attempts set window_started_at = now() - interval '16 minutes' where key = any($1::text[])`,
                [pausedKeys],
            );
            expect(expired.rowCount).toBe(1);

            expect((await tryLogin(email, PASSWORD)).status).toBe(200);
        });

        it('does not limit anything when the limit is set to 0', async () => {
            vi.stubEnv('LOGIN_ATTEMPT_LIMIT', '0');
            const email = await ownAccount();

            for (let i = 0; i < 6; i++) {
                expect((await tryLogin(email, 'wrong')).status).toBe(400);
            }

            expect((await tryLogin(email, PASSWORD)).status).toBe(200);
        });
    });
});
