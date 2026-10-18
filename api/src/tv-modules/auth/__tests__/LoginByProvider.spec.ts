import type { Request, Response } from 'express';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { Database } from '../../../modules/db';
import AuthController from '../AuthController';
import AuthModel from '../AuthModel';

describe('loginByProvider email normalization', () => {
    const prefix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const lowerEmail = `${prefix}provider.user@test.com`;
    const authModel = new AuthModel();
    const controller = new AuthController();

    afterAll(async () => {
        await Database.getInstance().query('delete from tv_auth.users where lower(email) = $1', [lowerEmail]);
    });

    const callWith = async (email: string) => {
        const req = {
            user: { email, provider: 'github' },
            appUser: { authManager: { repository: authModel } },
            query: {},
        } as unknown as Request;
        const res = {
            redirect: vi.fn(),
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
        } as unknown as Response;

        await controller.loginByProvider(req, res);
        return res;
    };

    it('stores a mixed-case provider email lowercased', async () => {
        const res = await callWith(`${prefix}Provider.User@Test.com`);
        expect(res.redirect).toHaveBeenCalled();

        const rows = await Database.getInstance().query<{ email: string }>(
            'select email from tv_auth.users where lower(email) = $1',
            [lowerEmail],
        );
        expect(rows.rows.map((r) => r.email)).toEqual([lowerEmail]);
    });

    it('signs the same person in again with different casing instead of creating a second account', async () => {
        await callWith(`${prefix}PROVIDER.USER@TEST.COM`);

        const rows = await Database.getInstance().query<{ id: number }>(
            'select id from tv_auth.users where lower(email) = $1',
            [lowerEmail],
        );
        expect(rows.rows).toHaveLength(1);
    });
});
