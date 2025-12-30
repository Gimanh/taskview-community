import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../../modules/db';
import type { RegisterUserInDb } from '../../../types/auth.types';
import AuthModel from '../AuthModel';
import JwtStorage from '../JwtStorage';

describe('AuthModel Integration Tests', () => {
    let jwtStorage: JwtStorage;
    let authModel: AuthModel;
    let emailNum: number;
    let userId: number;
    let rowId: number;

    beforeEach(async () => {
        jwtStorage = new JwtStorage();
        authModel = new AuthModel();
        emailNum = Date.now();

        const userData: RegisterUserInDb = {
            login: `${emailNum}testuser`,
            email: `${emailNum}test@test.com`,
            password: 'hashed_password',
            confirmEmailCode: 'code123',
            block: 0,
        };
        userId = (await authModel.registerUserInDb(userData)) as number;
        rowId = (await jwtStorage.initTokenRecord(userId)) as number;
    });

    afterAll(async () => {
        const db = Database.getInstance();
        await db.query("delete from tv_auth.users where login not in ('user', 'user1', 'user3')");
    });

    it('initTokenRecord', async () => {
        expect(rowId).toBeTruthy();
        const deleteAllSession = await authModel.clearAllSessionTokensForUser(userId);
        expect(deleteAllSession).toBe(true);
    });

    it('updateTokens', async () => {
        const updateResult = await jwtStorage.updateTokens('access-1', 'refresh-1', rowId);
        expect(updateResult).toBe(true);
    });

    it('fetchTokens', async () => {
        let fetchResult = await jwtStorage.fetchTokens(rowId);
        expect(fetchResult).toBeTruthy();
        expect(fetchResult).toHaveProperty('id');
        expect(fetchResult).toHaveProperty('user_id');
        expect(fetchResult).toHaveProperty('access_token');
        expect(fetchResult).toHaveProperty('refresh_token');
        expect(fetchResult).toHaveProperty('user_ip');
        expect(fetchResult).toHaveProperty('time_creation');

        const updateResult = await jwtStorage.updateTokens('access-1', 'refresh-1', rowId);
        expect(updateResult).toBe(true);

        fetchResult = await jwtStorage.fetchTokens(rowId);
        expect(fetchResult).toBeTruthy();
        if (fetchResult) {
            expect(fetchResult.access_token).toBe('access-1');
            expect(fetchResult.refresh_token).toBe('refresh-1');
        }
    });

    it('deleteTokens', async () => {
        const result = await jwtStorage.deleteTokens(userId, 'access-1');
        expect(result).toBe(true);
    });
});
