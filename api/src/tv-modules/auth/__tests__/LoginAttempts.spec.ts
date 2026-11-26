import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Database } from '../../../modules/db';
import { LoginAttempts } from '../LoginAttempts';

// Works on the storage directly, where an attempt can come from any address.
// Every test uses logins and addresses of its own, so parallel specs do not meet
describe('LoginAttempts', () => {
    const attempts = new LoginAttempts();
    const unique = () => `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
    const ownLogin = () => `la${unique()}@mail.dest`;
    const ownAddress = () => `test-address-${unique()}`;
    const fail = async (login: string, ip: string, times: number) => {
        for (let i = 0; i < times; i++) await attempts.registerFailure({ login, ip });
    };

    beforeEach(() => {
        vi.stubEnv('LOGIN_ATTEMPT_LIMIT', '2');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('allows attempts below the limit and pauses at it', async () => {
        const login = ownLogin();
        const ip = ownAddress();

        await fail(login, ip, 1);
        expect(await attempts.secondsUntilAllowed({ login, ip })).toBe(0);

        await fail(login, ip, 1);
        const wait = await attempts.secondsUntilAllowed({ login, ip });
        expect(wait).toBeGreaterThan(0);
        expect(wait).toBeLessThanOrEqual(15 * 60);
    });

    it('keeps the account open from another address until the account-wide limit', async () => {
        const login = ownLogin();
        await fail(login, ownAddress(), 2);

        expect(await attempts.secondsUntilAllowed({ login, ip: ownAddress() })).toBe(0);

        // 2 per address, 10 for the account from all addresses together
        for (let i = 0; i < 4; i++) await fail(login, ownAddress(), 2);
        expect(await attempts.secondsUntilAllowed({ login, ip: ownAddress() })).toBeGreaterThan(0);
    });

    it('pauses an address that fails across many accounts', async () => {
        const ip = ownAddress();

        // 20 failures from one address, one per account
        for (let i = 0; i < 19; i++) await fail(ownLogin(), ip, 1);
        expect(await attempts.secondsUntilAllowed({ login: ownLogin(), ip })).toBe(0);

        await fail(ownLogin(), ip, 1);
        expect(await attempts.secondsUntilAllowed({ login: ownLogin(), ip })).toBeGreaterThan(0);
        expect(await attempts.secondsUntilAllowed({ login: ownLogin(), ip: ownAddress() })).toBe(0);
    });

    it('clears the count of the account from that address after a success', async () => {
        const login = ownLogin();
        const ip = ownAddress();
        await fail(login, ip, 2);

        await attempts.clearAfterSuccess({ login, ip });

        expect(await attempts.secondsUntilAllowed({ login, ip })).toBe(0);
    });

    it('starts a new window when the old one has passed', async () => {
        const login = ownLogin();
        const ip = ownAddress();
        await fail(login, ip, 2);
        await Database.getInstance().query(
            `update tv_auth.login_attempts set window_started_at = now() - interval '16 minutes' where key = $1`,
            [`ip:${ip}`],
        );
        expect(await attempts.secondsUntilAllowed({ login: ownLogin(), ip })).toBe(0);

        await fail(ownLogin(), ip, 1);

        const row = await Database.getInstance().query(
            'select failures from tv_auth.login_attempts where key = $1',
            [`ip:${ip}`],
        );
        expect(row.rows[0].failures).toBe(1);
    });

    it('does not store the login itself', async () => {
        const login = ownLogin();
        await fail(login, ownAddress(), 1);

        const rows = await Database.getInstance().query(
            'select 1 from tv_auth.login_attempts where key like $1',
            [`%${login}%`],
        );
        expect(rows.rowCount).toBe(0);
    });

    it('counts nothing when the limit is 0', async () => {
        vi.stubEnv('LOGIN_ATTEMPT_LIMIT', '0');
        const login = ownLogin();
        const ip = ownAddress();

        await fail(login, ip, 5);

        const row = await Database.getInstance().query('select 1 from tv_auth.login_attempts where key = $1', [`ip:${ip}`]);
        expect(row.rowCount).toBe(0);
        expect(await attempts.secondsUntilAllowed({ login, ip })).toBe(0);
    });
});
