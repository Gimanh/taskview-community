import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../../modules/db';
import type { RegisterUserInDb } from '../../../types/auth.types';
import AuthModel from '../AuthModel';
import SessionStorage from '../SessionStorage';

describe('SessionStorage Integration Tests', () => {
    let sessionStorage: SessionStorage;
    let authModel: AuthModel;
    let emailNum: number;
    let userId: number;
    let sessionId: number;

    beforeEach(async () => {
        sessionStorage = new SessionStorage();
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
        sessionId = (await sessionStorage.createSession(userId, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120')) as number;
    });

    afterAll(async () => {
        const db = Database.getInstance();
        await db.query("delete from tv_auth.users where login not in ('user', 'user1', 'user3')");
    });

    it('createSession', async () => {
        expect(sessionId).toBeTruthy();
        const deleteAllSession = await authModel.clearAllSessionTokensForUser(userId);
        expect(deleteAllSession).toBe(true);
    });

    it('isSessionActive', async () => {
        const isActive = await sessionStorage.isSessionActive(sessionId);
        expect(isActive).toBe(true);

        const isInactive = await sessionStorage.isSessionActive(999999);
        expect(isInactive).toBe(false);
    });

    it('fetchUserSessions', async () => {
        const sessions = await sessionStorage.fetchUserSessions(userId);
        expect(sessions.length).toBeGreaterThan(0);
        expect(sessions[0]).toHaveProperty('id');
        expect(sessions[0]).toHaveProperty('userId');
        expect(sessions[0]).toHaveProperty('deviceName');
        expect(sessions[0]).toHaveProperty('userIp');
    });

    it('deleteSession', async () => {
        const result = await sessionStorage.deleteSession(sessionId, userId);
        expect(result).toBe(true);

        const isActive = await sessionStorage.isSessionActive(sessionId);
        expect(isActive).toBe(false);
    });
});
