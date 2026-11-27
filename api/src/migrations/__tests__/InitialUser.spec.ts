import { compareSync } from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { InitialUser } from '../InitialUser';

describe('InitialUser.checkPassword', () => {
    it('reports a missing password when the variable is unset or empty', () => {
        expect(InitialUser.checkPassword(undefined)).toEqual({ status: 'missing' });
        expect(InitialUser.checkPassword('')).toEqual({ status: 'missing' });
    });

    it('rejects a password shorter than the minimum', () => {
        expect(InitialUser.checkPassword('12345').status).toBe('invalid');
    });

    it('rejects a password longer than the maximum', () => {
        expect(InitialUser.checkPassword('a'.repeat(129)).status).toBe('invalid');
    });

    it('rejects a password wrapped in whitespace', () => {
        expect(InitialUser.checkPassword(' secret-pass ').status).toBe('invalid');
        expect(InitialUser.checkPassword('       ').status).toBe('invalid');
    });

    it('accepts a password within the limits', () => {
        expect(InitialUser.checkPassword('s3cret-pass')).toEqual({ status: 'ok', password: 's3cret-pass' });
    });
});

describe('InitialUser.create', () => {
    it('inserts the account with a hash of the given password', async () => {
        const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });

        await InitialUser.create({ client: { query }, password: 's3cret-pass' });

        expect(query).toHaveBeenCalledTimes(1);
        const [sql, params] = query.mock.calls[0];
        expect(sql).toContain('INSERT INTO tv_auth.users');
        expect(params[0]).toBe('user');
        expect(params[1]).toBe('test@mail.dest');
        expect(params[2]).not.toBe('s3cret-pass');
        expect(compareSync('s3cret-pass', params[2])).toBe(true);
    });
});
