import axios from 'axios';
import http from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { decrypt } from '../../../utils/crypto';
import { integrationsOfGoal as integrationsOfGoalRows } from './support';
import type { IntegrationProvider } from '../types';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

// The provider side is not under test. The code is never sent anywhere; the
// exchange just hands back a token so the callback can be driven to the end.
vi.mock('../providers/github.provider', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../providers/github.provider')>()),
    exchangeGitHubCode: vi.fn().mockResolvedValue('gh-access-token'),
}));
vi.mock('../providers/gitlab.provider', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../providers/gitlab.provider')>()),
    exchangeGitLabCode: vi.fn().mockResolvedValue({ accessToken: 'gl-access-token', refreshToken: 'gl-refresh-token' }),
}));
vi.mock('../providers/gitea.provider', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../providers/gitea.provider')>()),
    exchangeGiteaCode: vi.fn().mockResolvedValue({ accessToken: 'gt-access-token', refreshToken: null }),
}));

const port = 1815;
const url = `http://localhost:${port}`;
const NONCE_COOKIE = 'tv_integrations_oauth';

const LOGIN = 'test@mail.dest';
const PASSWORD = 'user1!#Q';

let server: http.Server;
let jwt = '';
let goalId = 0;

const api = axios.create({
    baseURL: url,
    validateStatus: () => true,
    maxRedirects: 0,
    httpAgent: new http.Agent({ keepAlive: false }),
});

const initiate = (projectId: number, provider: IntegrationProvider = 'github') =>
    api.get(`/module/integrations/oauth/${provider}?projectId=${projectId}&token=${encodeURIComponent(jwt)}`);

const nonceFrom = (response: { headers: Record<string, unknown> }): string => {
    const raw = ([] as string[]).concat((response.headers['set-cookie'] as string[]) ?? []);
    const cookie = raw.find((entry) => entry.startsWith(`${NONCE_COOKIE}=`));
    expect(cookie).toBeDefined();
    return (cookie as string).split(';')[0].split('=')[1];
};

const stateFrom = (response: { headers: Record<string, unknown> }): string => {
    const location = new URL(response.headers.location as string);
    return location.searchParams.get('state') as string;
};

const callback = (state: string, nonce?: string, provider: IntegrationProvider = 'github') =>
    api.get(`/module/integrations/oauth/${provider}/callback?code=whatever&state=${encodeURIComponent(state)}`, {
        headers: nonce ? { Cookie: `${NONCE_COOKIE}=${nonce}` } : {},
    });

const integrationsOfGoal = async () => {
    const response = await api.get(`/module/integrations?projectId=${goalId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(response.status).toBe(200);
    return response.data.response as { id: number }[];
};

/**
 * A git integration is connected over OAuth where TaskView is the client. The
 * callback must only complete for the browser that started the flow, and only
 * into a project the initiator may manage — otherwise an attacker starts a flow
 * for his own project and tricks a victim into finishing it with her account.
 */
describe('Integrations OAuth browser binding', () => {
    beforeAll(async () => {
        for (const provider of ['GITHUB', 'GITLAB', 'GITEA']) {
            process.env[`${provider}_INTEGRATION_CLIENT_ID`] ??= 'test-client';
            process.env[`${provider}_INTEGRATION_CALLBACK_URL`] ??= `${url}/module/integrations/oauth/${provider.toLowerCase()}/callback`;
        }
        process.env.ENCRYPTION_KEY ??= 'ab'.repeat(32);

        server = new App(port).listen();

        const login = await api.post('/module/auth/login', { login: LOGIN, password: PASSWORD });
        expect(login.status).toBe(200);
        jwt = login.data.access;

        const goal = await api.post(
            '/module/goals',
            { name: `integrations-oauth-it-${Date.now()}` },
            { headers: { Authorization: `Bearer ${jwt}` } },
        );
        expect(goal.status).toBe(200);
        goalId = goal.data.response.id ?? goal.data.response.goal?.id;
    });

    afterAll(async () => {
        for (const integration of await integrationsOfGoal()) {
            await api.delete('/module/integrations', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { id: integration.id },
            });
        }
        if (goalId) {
            await api.delete('/module/goals', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { goalId },
            });
        }
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('refuses to start a flow without a token', async () => {
        const response = await api.get(`/module/integrations/oauth/github?projectId=${goalId}`);
        expect(response.status).toBe(401);
    });

    it('refuses to start a flow for a project the user may not manage', async () => {
        const response = await initiate(999_999_999);
        expect(response.status).toBe(403);
        expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('refuses an unknown provider', async () => {
        const response = await api.get(`/module/integrations/oauth/bitbucket?projectId=${goalId}&token=${encodeURIComponent(jwt)}`);
        expect(response.status).toBe(400);
    });

    it('starts a flow with a nonce cookie and a state carrying only its hash', async () => {
        const response = await initiate(goalId);
        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('github.com');

        const nonce = nonceFrom(response);
        const state = stateFrom(response);
        expect(nonce.length).toBeGreaterThanOrEqual(32);
        expect(state).not.toContain(nonce);

        const cookie = (response.headers['set-cookie'] as string[]).find((entry) => entry.startsWith(NONCE_COOKIE)) as string;
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite=Lax/i);
        expect(cookie).toContain('Path=/module/integrations/oauth');
    });

    it('rejects a callback that arrives without the nonce cookie', async () => {
        const started = await initiate(goalId);
        const response = await callback(stateFrom(started));

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('oauth=error');
        expect(await integrationsOfGoal()).toHaveLength(0);
    });

    it('rejects a callback whose cookie belongs to another browser', async () => {
        const attacker = await initiate(goalId);
        const victim = await initiate(goalId);
        const response = await callback(stateFrom(attacker), nonceFrom(victim));

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('oauth=error');
        expect(await integrationsOfGoal()).toHaveLength(0);
    });

    it('completes a callback from the browser that started the flow and clears the cookie', async () => {
        const started = await initiate(goalId);
        const response = await callback(stateFrom(started), nonceFrom(started));

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain(`/${goalId}/integrations?oauth=success`);

        const cleared = (response.headers['set-cookie'] as string[]).find((entry) => entry.startsWith(NONCE_COOKIE)) as string;
        expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);

        expect(await integrationsOfGoal()).toHaveLength(1);
    });

    describe.each([
        { provider: 'gitlab' as const, accessToken: 'gl-access-token', refreshToken: 'gl-refresh-token' },
        { provider: 'gitea' as const, accessToken: 'gt-access-token', refreshToken: null },
    ])('$provider', ({ provider, accessToken, refreshToken }) => {
        it('completes the same bound flow and stores the tokens encrypted', async () => {
            const started = await initiate(goalId, provider);
            expect(started.status).toBe(302);
            const response = await callback(stateFrom(started), nonceFrom(started), provider);
            expect(response.headers.location).toContain('oauth=success');

            const row = (await integrationsOfGoalRows(goalId)).find((r) => r.provider === provider);
            expect(row).toBeDefined();
            expect(row?.access_token_encrypted).not.toContain(accessToken);
            expect(decrypt(row?.access_token_encrypted as string)).toBe(accessToken);
            if (refreshToken) expect(decrypt(row?.refresh_token_encrypted as string)).toBe(refreshToken);
            else expect(row?.refresh_token_encrypted).toBeNull();
        });

        it('refuses a callback carrying a state minted for another provider', async () => {
            const started = await initiate(goalId, 'github');
            const response = await callback(stateFrom(started), nonceFrom(started), provider);
            expect(response.headers.location).toContain('oauth=error');
        });
    });
});
