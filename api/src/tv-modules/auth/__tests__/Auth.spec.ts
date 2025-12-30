import axios from 'axios';
import type http from 'http';
import { decode } from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import type { UserJwtPayload } from '../../../types/auth.types';
import { delay } from '../../../utils/helpers';
import AuthModel from '../AuthModel';
import JwtStorage from '../JwtStorage';

const port = 1809;
const url = `http://localhost:${port}`;

let server: http.Server;
let deleteTestUserEmail: string = '';

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
        server = new App(port).listen();
    });

    afterAll(async () => {
        server.close();
        const db = Database.getInstance();
        await db.query("delete from tv_auth.users where login not in ('user', 'user1', 'user3')");
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

        const jwtStorage = new JwtStorage();
        const result = await jwtStorage.fetchTokens(payloadRefresh.id);

        if (!result) {
            throw new Error('Can not fetch tokens');
        }
        expect(result.access_token).toBeTruthy();
    });

    it('Registration', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
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

        expect(response3.status).toBe(200);
    });

    it('logout without token', async () => {
        deleteTestUserEmail = `${Date.now()}test@mail.dest`;
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
});
