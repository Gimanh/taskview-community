import { beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../../modules/db';
import type { RegisterUserInDb } from '../../../types/auth.types';
import AuthModel from '../AuthModel';

describe('AuthModel Integration Tests', () => {
    let authModel: AuthModel;
    let emailNum: number;

    beforeEach(async () => {
        authModel = new AuthModel();
        emailNum = Date.now();
    });

    it('registerUserInDb', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser`,
            email: `${emailNum}test@test.com`,
            password: 'hashed_password',
            confirmEmailCode: 'code123',
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();

        const user = await authModel.fetchUserById(userId as number);

        expect(user).toEqual({
            id: userId,
            login: `${emailNum}testuser`,
            email: `${emailNum}test@test.com`,
            password: 'hashed_password',
            confirm_email_code: 'code123',
            block: 0,
            remember_token: null,
            remind_password_code: null,
            remind_password_time: null,
        });
    });

    it('getUserByLogin', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: 'code456',
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();

        const user = await authModel.getUserByLogin(`${emailNum}testuser2`, false);
        expect(user).toEqual({
            id: userId,
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirm_email_code: 'code456',
            block: 0,
            remember_token: null,
            remind_password_code: null,
            remind_password_time: null,
        });
    });

    it('fetchUserById', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: 'code456',
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();

        if (!userId) {
            throw new Error('Error to register user');
        }

        const user = await authModel.fetchUserById(userId);
        expect(user).toEqual({
            id: userId,
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirm_email_code: 'code456',
            block: 0,
            remember_token: null,
            remind_password_code: null,
            remind_password_time: null,
        });
    });

    it('fetchUserByEmail', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: 'code456',
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();

        if (!userId) {
            throw new Error('Error to register user');
        }

        const user = await authModel.fetchUserByEmail(userData['email']);
        expect(user).toEqual({
            id: userId,
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirm_email_code: 'code456',
            block: 0,
            remember_token: null,
            remind_password_code: null,
            remind_password_time: null,
        });
    });

    it('confirmEmail', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: `${emailNum}code456`,
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();

        if (!userId) {
            throw new Error('Error to register user');
        }

        const result = await authModel.confirmEmail(userData.login, `${userData.confirmEmailCode}fff`, 0);
        expect(result).toBe(false);

        const result2 = await authModel.confirmEmail(userData.login, userData.confirmEmailCode, 0);
        expect(result2).toBe(true);
    });

    it('setReminderCodeAndTime with values for unexists user', async () => {
        const data = {
            email: 'some@mail.com',
            code: 'code-string',
            time: Math.floor(Date.now() / 1000),
        };
        const result = await authModel.setReminderCodeAndTime(data.email, data.code, data.time);
        expect(result).toBe(false);
    });

    it('setReminderCodeAndTime with values for unexists user', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: `${emailNum}code456`,
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();

        const data = {
            email: userData.email,
            code: 'code-string',
            time: Math.floor(Date.now() / 1000),
        };
        const result = await authModel.setReminderCodeAndTime(data.email, data.code, data.time);
        expect(result).toBe(true);
        const user = await authModel.getUserByLogin(userData.login);
        expect(user).toBeTruthy();

        if (user) {
            expect(user.remind_password_code).toBe(data.code);
            expect(user.remind_password_time).toBe(data.time);
        }
    });

    it('setReminderCodeAndTime set NULL', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: `${emailNum}code456`,
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();

        const data = {
            email: userData.email,
            code: 'code-string',
            time: Math.floor(Date.now() / 1000),
        };

        const result = await authModel.setReminderCodeAndTime(data.email, null, null);
        expect(result).toBe(true);

        const user = await authModel.getUserByLogin(userData.login);
        expect(user).toBeTruthy();

        if (user) {
            expect(user.remind_password_code).toBe(null);
            expect(user.remind_password_time).toBe(null);
        }
    });

    it('Update password for user', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: `${emailNum}code456`,
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();
        if (userId) {
            const updateResult = await authModel.updateUserPassword('new_password', userId);
            expect(updateResult).toBeTruthy();
            const user = await authModel.fetchUserById(userId);
            if (user) {
                expect(user.password).toBe('new_password');
            }
        }
    });

    it('Delete all sessions clearAllSessionTokensForUser', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: `${emailNum}code456`,
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);
        expect(userId).toBeTruthy();
        if (userId) {
            //we do not have any active sessions
            const deleteSessionResult = await authModel.clearAllSessionTokensForUser(userId);
            expect(deleteSessionResult).toBeFalsy();
        }
    });

    it('addDeleteAccountCode', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: `${emailNum}code456`,
            block: 0,
        };

        const userId = await authModel.registerUserInDb(userData);

        expect(userId).toBeTruthy();

        if (userId) {
            const result = await authModel.addDeleteAccountCode(`${emailNum}some-code`, userId);
            expect(result).toBe(true);
            const db = Database.getInstance();
            const codeResult = await db.query('select * from tv_auth.account_deletion where code = $1', [
                `${emailNum}some-code`,
            ]);
            expect(codeResult.rows[0].user_id).toBe(userId);
            expect(codeResult.rows[0].code).toBe(`${emailNum}some-code`);
        }
    });

    it('deleteUserAccount', async () => {
        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser2`,
            email: `${emailNum}test2@test.com`,
            password: 'hashed_password',
            confirmEmailCode: `${emailNum}code456`,
            block: 0,
        };
        const code = `${emailNum}some-code`;
        const userId = await authModel.registerUserInDb(userData);

        if (!userId) {
            throw new Error();
        }

        const db = Database.getInstance();

        expect(userId).toBeTruthy();

        if (userId) {
            const result = await authModel.addDeleteAccountCode(code, userId);
            expect(result).toBe(true);

            const codeResult = await db.query('select * from tv_auth.account_deletion where code = $1', [code]);
            expect(codeResult.rows[0].user_id).toBe(userId);
            expect(codeResult.rows[0].code).toBe(code);
        }
        const deleteResult = await authModel.deleteUserAccount(code, userId);
        expect(deleteResult).toBe(true);

        const codeResult = await db.query('select * from tv_auth.account_deletion where code = $1', [code]);
        expect(codeResult.rows.length).toBe(0);

        const user = await authModel.getUserByLogin(userData.login);
        expect(user).toBe(false);
    });
});
