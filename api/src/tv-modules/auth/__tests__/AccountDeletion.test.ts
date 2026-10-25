import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AccountDeletion } from '../AccountDeletion';
import { RequireAccountDeletion } from '../middlewares/require-account-deletion';

const runWith = (value: string | undefined) => {
    vi.stubEnv('ALLOW_ACCOUNT_DELETION', value);
    const next = vi.fn();
    const send = vi.fn();
    const res = { status: vi.fn(() => ({ send })) } as unknown as Response;

    RequireAccountDeletion({} as Request, res, next);
    return { next, res };
};

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('RequireAccountDeletion', () => {
    it('refuses when ALLOW_ACCOUNT_DELETION is not set: deletion is off by default', () => {
        const { next, res } = runWith(undefined);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('refuses when ALLOW_ACCOUNT_DELETION=false', () => {
        const { next, res } = runWith('false');
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('lets the request through when ALLOW_ACCOUNT_DELETION=true, in any case and with spaces', () => {
        for (const value of ['true', ' TRUE ']) {
            const { next, res } = runWith(value);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        }
    });
});

describe('AccountDeletion.validateOnStartup', () => {
    it('accepts true, false and an unset value', () => {
        for (const value of [undefined, '', 'true', 'false', ' False ']) {
            vi.stubEnv('ALLOW_ACCOUNT_DELETION', value);
            expect(() => AccountDeletion.validateOnStartup()).not.toThrow();
        }
    });

    it('stops the server on a value that is neither true nor false', () => {
        for (const value of ['yes', '1', 'on']) {
            vi.stubEnv('ALLOW_ACCOUNT_DELETION', value);
            expect(() => AccountDeletion.validateOnStartup()).toThrow(/ALLOW_ACCOUNT_DELETION/);
        }
    });
});
