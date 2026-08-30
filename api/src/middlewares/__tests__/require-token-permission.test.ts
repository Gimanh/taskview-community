import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { RequireTokenPermission } from '../require-token-permission';
import { GoalPermissions } from '../../types/auth.types';

const runWith = (tokenPermissions: string[] | undefined) => {
    const next = vi.fn();
    const end = vi.fn();
    const res = { status: vi.fn(() => ({ end })), end } as unknown as Response;
    const req = { appUser: { getTokenPermissions: () => tokenPermissions } } as unknown as Request;

    RequireTokenPermission(GoalPermissions.ORG_CAN_MANAGE)(req, res, next);
    return { next, res };
};

describe('RequireTokenPermission', () => {
    it('lets a browser session through — it carries no token permissions', () => {
        const { next, res } = runWith(undefined);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('lets an unrestricted token through, keeping existing integrations working', () => {
        const { next } = runWith([]);
        expect(next).toHaveBeenCalled();
    });

    it('lets a token holding the permission through', () => {
        const { next } = runWith([GoalPermissions.ORG_CAN_MANAGE]);
        expect(next).toHaveBeenCalled();
    });

    it('blocks a restricted token that was not given the permission', () => {
        const { next, res } = runWith([GoalPermissions.TIMETRACKING_CAN_VIEW]);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('does not accept a neighbouring permission from the same group', () => {
        const { next, res } = runWith([GoalPermissions.ORG_CAN_MANAGE_MEMBERS]);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
