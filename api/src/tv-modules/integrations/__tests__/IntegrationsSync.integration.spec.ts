import http from 'http';
import nock from 'nock';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { TasksRepository } from '../../tasks/TasksRepository';
import { cleanupGoal, createApi, insertIntegration, integrationsOfGoal, loginAndCreateGoal, mappingsOf, tasksOfGoal } from './support';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1818;
const api = createApi(port);

let server: http.Server;
let jwt = '';
let goalId = 0;

const sync = (integrationId: number) =>
    api.post('/module/integrations/sync', { integrationId }, { headers: { Authorization: `Bearer ${jwt}` } });

/**
 * Manual sync pulls the repository's issues into the project as tasks. The
 * provider is answered by nock; everything on our side — token decryption,
 * ordering, batch insert, mapping upsert, incremental since — is real.
 */
describe('Integrations issue sync', () => {
    beforeAll(async () => {
        process.env.ENCRYPTION_KEY ??= 'ab'.repeat(32);
        nock.disableNetConnect();
        nock.enableNetConnect(/localhost|127\.0\.0\.1/);
        server = new App(port).listen();
        ({ jwt, goalId } = await loginAndCreateGoal(api, `integrations-sync-it-${Date.now()}`));
    });

    afterEach(() => {
        expect(nock.pendingMocks()).toEqual([]);
        nock.cleanAll();
    });

    afterAll(async () => {
        nock.enableNetConnect();
        await cleanupGoal(api, jwt, goalId);
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    describe('GitHub', () => {
        const repo = 'sync-it/github';
        let integrationId = 0;
        const gh = (number: number, state: 'open' | 'closed', extra: Record<string, unknown> = {}) =>
            ({ number, title: `GH ${number}`, body: `body ${number}`, state, html_url: '', ...extra });

        beforeAll(async () => {
            integrationId = await insertIntegration({ provider: 'github', projectId: goalId, repoFullName: repo, accessToken: 'gh-token' });
        });

        it('creates one task per issue, oldest first, newest on top of the kanban, and skips pull requests', async () => {
            nock('https://api.github.com')
                .get(`/repos/${repo}/issues`).query((q) => q.since === undefined)
                .matchHeader('authorization', 'Bearer gh-token')
                .reply(200, [gh(3, 'open'), gh(2, 'closed'), gh(1, 'open'), gh(4, 'open', { pull_request: {} })]);

            const response = await sync(integrationId);
            expect(response.status).toBe(200);
            expect(response.data.response).toEqual({ synced: 3 });

            const tasks = await tasksOfGoal(goalId);
            expect(tasks.map((t) => t.description)).toEqual(['GH 1', 'GH 2', 'GH 3']);
            expect(tasks.map((t) => t.complete)).toEqual([false, true, false]);
            const gap = TasksRepository.KANBAN_ORDER_GAP;
            expect(tasks.map((t) => t.kanban_order)).toEqual([-gap, -gap * 2, -gap * 3]);
            expect(tasks[0].source_url).toBe(`https://github.com/${repo}/issues/1`);
            expect((await mappingsOf(integrationId)).map((m) => [m.issue_number, m.issue_state])).toEqual([[1, 'open'], [2, 'closed'], [3, 'open']]);
            expect((await integrationsOfGoal(goalId))[0].last_synced_at).not.toBeNull();
        });

        it('a second sync is incremental and updates existing tasks instead of duplicating them', async () => {
            nock('https://api.github.com')
                .get(`/repos/${repo}/issues`).query((q) => typeof q.since === 'string' && q.sort === 'updated')
                .reply(200, [gh(1, 'closed', { title: 'GH 1 done' })]);

            const response = await sync(integrationId);
            expect(response.data.response).toEqual({ synced: 0 });

            const tasks = await tasksOfGoal(goalId);
            expect(tasks).toHaveLength(3);
            expect(tasks[0]).toMatchObject({ description: 'GH 1 done', complete: true });
            expect((await mappingsOf(integrationId))[0].issue_state).toBe('closed');
        });

        it('reports zero and stays quiet when the provider is unreachable', async () => {
            nock('https://api.github.com').get(`/repos/${repo}/issues`).query(true).reply(502, 'bad gateway');

            const response = await sync(integrationId);
            expect(response.status).toBe(200);
            expect(response.data.response).toEqual({ synced: 0 });
            expect(await tasksOfGoal(goalId)).toHaveLength(3);
        });
    });

    describe('GitLab', () => {
        let integrationId = 0;

        beforeAll(async () => {
            integrationId = await insertIntegration({
                provider: 'gitlab', projectId: goalId, repoFullName: 'sync-it/gitlab', repoExternalId: '4242',
                accessToken: 'gl-token', refreshToken: 'gl-refresh',
            });
        });

        it('probes the token, then syncs by iid into the same project', async () => {
            nock('https://gitlab.com/api/v4')
                .get('/user').matchHeader('authorization', 'Bearer gl-token').reply(200, {})
                .get('/projects/4242/issues').query(true)
                .reply(200, [{ iid: 10, title: 'GL 10', description: null, state: 'opened', web_url: '' }]);

            const response = await sync(integrationId);
            expect(response.data.response).toEqual({ synced: 1 });
            expect(await mappingsOf(integrationId)).toMatchObject([{ issue_number: 10, issue_state: 'open' }]);
            expect((await tasksOfGoal(goalId)).at(-1)).toMatchObject({ description: 'GL 10', source_url: 'https://gitlab.com/sync-it/gitlab/-/issues/10' });
        });

        it('refreshes an expired token and persists the new pair before syncing', async () => {
            nock('https://gitlab.com/api/v4').get('/user').reply(401, {});
            nock('https://gitlab.com').post('/oauth/token', (b) => b.refresh_token === 'gl-refresh')
                .reply(200, { access_token: 'gl-token-2', refresh_token: 'gl-refresh-2' });
            nock('https://gitlab.com/api/v4').get('/projects/4242/issues').query(true)
                .matchHeader('authorization', 'Bearer gl-token-2').reply(200, []);

            expect((await sync(integrationId)).data.response).toEqual({ synced: 0 });

            // The next probe must use the rotated token straight from the database.
            nock('https://gitlab.com/api/v4')
                .get('/user').matchHeader('authorization', 'Bearer gl-token-2').reply(200, {})
                .get('/projects/4242/issues').query(true).reply(200, []);
            expect((await sync(integrationId)).status).toBe(200);
        });
    });

    describe('Gitea', () => {
        let integrationId = 0;

        beforeAll(async () => {
            integrationId = await insertIntegration({ provider: 'gitea', projectId: goalId, repoFullName: 'sync-it/gitea', accessToken: 'gt-token' });
        });

        it('syncs without a probe when there is no refresh token', async () => {
            nock('https://gitea.com/api/v1')
                .get('/repos/sync-it/gitea/issues').query((q) => q.type === 'issues')
                .matchHeader('authorization', 'Bearer gt-token')
                .reply(200, [{ number: 5, title: 'GT 5', body: 'b', state: 'closed', html_url: '' }]);

            expect((await sync(integrationId)).data.response).toEqual({ synced: 1 });
            expect(await mappingsOf(integrationId)).toMatchObject([{ issue_number: 5, issue_state: 'closed' }]);
            expect((await tasksOfGoal(goalId)).at(-1)).toMatchObject({ description: 'GT 5', complete: true, source_url: 'https://gitea.com/sync-it/gitea/issues/5' });
        });
    });

    it('syncs nothing for an integration that has no repository selected yet', async () => {
        const bare = await insertIntegration({ provider: 'github', projectId: goalId, accessToken: 'gh-token' });
        expect((await sync(bare)).data.response).toEqual({ synced: 0 });
    });
});
