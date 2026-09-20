import http from 'http';
import { createHmac } from 'crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { cleanupGoal, createApi, insertIntegration, loginAndCreateGoal, mappingsOf, tasksOfGoal } from './support';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1816;
const api = createApi(port);
const SECRET = 'webhook-secret-under-test';

let server: http.Server;
let jwt = '';
let goalId = 0;

const post = (path: string, body: unknown, headers: Record<string, string>) =>
    api.post(path, JSON.stringify(body), { headers: { 'Content-Type': 'application/json', ...headers } });

const githubHeaders = (body: unknown, secret = SECRET, event = 'issues') => ({
    'X-GitHub-Event': event,
    'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex'),
});
const giteaHeaders = (body: unknown, secret = SECRET, event = 'issues') => ({
    'X-Gitea-Event': event,
    'X-Gitea-Signature': createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex'),
});

/**
 * Inbound webhooks are unauthenticated HTTP from the provider. The only thing
 * standing between the internet and a project's task list is the signature
 * over the raw body (GitHub, Gitea) or the shared token (GitLab), looked up by
 * the repository named in the payload.
 */
describe('Integrations inbound webhooks', () => {
    beforeAll(async () => {
        process.env.ENCRYPTION_KEY ??= 'ab'.repeat(32);
        server = new App(port).listen();
        ({ jwt, goalId } = await loginAndCreateGoal(api, `integrations-webhooks-it-${Date.now()}`));
    });

    afterAll(async () => {
        await cleanupGoal(api, jwt, goalId);
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    describe('GitHub', () => {
        const repo = `wh-it/github-${Date.now()}`;
        let integrationId = 0;
        const issue = (number: number, extra: Record<string, unknown> = {}) => ({
            action: 'opened',
            repository: { full_name: repo },
            issue: { number, title: `Issue ${number}`, body: `Body ${number}`, ...extra },
        });

        beforeAll(async () => {
            integrationId = await insertIntegration({ provider: 'github', projectId: goalId, repoFullName: repo, webhookSecret: SECRET });
        });

        it('refuses a delivery without a signature', async () => {
            const body = issue(1);
            const response = await post('/module/integrations/webhook/github', body, { 'X-GitHub-Event': 'issues' });
            expect(response.status).toBe(401);
            expect(await tasksOfGoal(goalId)).toHaveLength(0);
        });

        it('acknowledges events it does not handle without touching anything', async () => {
            const body = issue(1);
            const response = await post('/module/integrations/webhook/github', body, githubHeaders(body, SECRET, 'push'));
            expect(response.status).toBe(200);
            expect(await tasksOfGoal(goalId)).toHaveLength(0);
        });

        it('answers 404 for a repository nobody connected', async () => {
            const body = { ...issue(1), repository: { full_name: 'nobody/connected-this' } };
            const response = await post('/module/integrations/webhook/github', body, githubHeaders(body));
            expect(response.status).toBe(404);
        });

        it('refuses a signature made with another secret', async () => {
            const body = issue(1);
            const response = await post('/module/integrations/webhook/github', body, githubHeaders(body, 'wrong-secret'));
            expect(response.status).toBe(401);
            expect(await tasksOfGoal(goalId)).toHaveLength(0);
        });

        it('refuses a valid signature whose body was tampered with in transit', async () => {
            const signed = issue(1);
            const tampered = issue(1, { title: 'Tampered' });
            const response = await post('/module/integrations/webhook/github', tampered, githubHeaders(signed));
            expect(response.status).toBe(401);
        });

        it('creates a task with its mapping when an issue is opened', async () => {
            const body = issue(1);
            const response = await post('/module/integrations/webhook/github', body, githubHeaders(body));
            expect(response.status).toBe(200);

            const tasks = await tasksOfGoal(goalId);
            expect(tasks).toHaveLength(1);
            expect(tasks[0]).toMatchObject({ description: 'Issue 1', note: 'Body 1', complete: false, source_url: `https://github.com/${repo}/issues/1` });
            expect(await mappingsOf(integrationId)).toMatchObject([{ task_id: tasks[0].id, issue_number: 1, issue_state: 'open' }]);
        });

        it('does not duplicate the task when the same issue is opened again', async () => {
            const body = issue(1);
            await post('/module/integrations/webhook/github', body, githubHeaders(body));
            expect(await tasksOfGoal(goalId)).toHaveLength(1);
        });

        it('edits the title and note in place', async () => {
            const body = { ...issue(1, { title: 'Renamed', body: null }), action: 'edited' };
            await post('/module/integrations/webhook/github', body, githubHeaders(body));
            expect((await tasksOfGoal(goalId))[0]).toMatchObject({ description: 'Renamed', note: null });
        });

        it('completes the task when the issue is closed and reopens it afterwards', async () => {
            const closed = { ...issue(1), action: 'closed' };
            await post('/module/integrations/webhook/github', closed, githubHeaders(closed));
            expect((await tasksOfGoal(goalId))[0].complete).toBe(true);
            expect((await mappingsOf(integrationId))[0].issue_state).toBe('closed');

            const reopened = { ...issue(1), action: 'reopened' };
            await post('/module/integrations/webhook/github', reopened, githubHeaders(reopened));
            expect((await tasksOfGoal(goalId))[0].complete).toBe(false);
            expect((await mappingsOf(integrationId))[0].issue_state).toBe('open');
        });

        it('ignores state changes for issues it never mapped', async () => {
            const body = { ...issue(999), action: 'closed' };
            const response = await post('/module/integrations/webhook/github', body, githubHeaders(body));
            expect(response.status).toBe(200);
            expect(await tasksOfGoal(goalId)).toHaveLength(1);
        });

        it('stops accepting deliveries once the integration is paused', async () => {
            const toggle = await api.patch('/module/integrations/toggle', { id: integrationId, isActive: false }, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            expect(toggle.status).toBe(200);

            const body = issue(2);
            const response = await post('/module/integrations/webhook/github', body, githubHeaders(body));
            expect(response.status).toBe(404);
            expect(await tasksOfGoal(goalId)).toHaveLength(1);
        });
    });

    describe('Gitea', () => {
        const repo = `wh-it/gitea-${Date.now()}`;
        let integrationId = 0;
        const issue = (number: number, action = 'opened') => ({
            action,
            repository: { full_name: repo },
            issue: { number, title: `Gitea ${number}`, body: null },
        });

        beforeAll(async () => {
            integrationId = await insertIntegration({ provider: 'gitea', projectId: goalId, repoFullName: repo, webhookSecret: SECRET });
        });

        it('refuses a GitHub-style prefixed signature', async () => {
            const body = issue(1);
            const headers = giteaHeaders(body);
            headers['X-Gitea-Signature'] = 'sha256=' + headers['X-Gitea-Signature'];
            const response = await post('/module/integrations/webhook/gitea', body, headers);
            expect(response.status).toBe(401);
        });

        it('creates, closes and reopens through the full lifecycle', async () => {
            const opened = issue(1);
            expect((await post('/module/integrations/webhook/gitea', opened, giteaHeaders(opened))).status).toBe(200);
            const mapping = (await mappingsOf(integrationId))[0];
            expect(mapping).toMatchObject({ issue_number: 1, issue_state: 'open' });

            const closed = issue(1, 'closed');
            await post('/module/integrations/webhook/gitea', closed, giteaHeaders(closed));
            expect((await mappingsOf(integrationId))[0].issue_state).toBe('closed');

            const reopened = issue(1, 'reopened');
            await post('/module/integrations/webhook/gitea', reopened, giteaHeaders(reopened));
            expect((await mappingsOf(integrationId))[0].issue_state).toBe('open');

            const task = (await tasksOfGoal(goalId)).find((t) => t.id === mapping.task_id);
            expect(task).toMatchObject({ description: 'Gitea 1', complete: false, source_url: `https://gitea.com/${repo}/issues/1` });
        });
    });

    describe('GitLab', () => {
        const externalId = String(700_000 + Math.floor(Math.random() * 100_000));
        let integrationId = 0;
        const event = (iid: number, action: string, extra: Record<string, unknown> = {}) => ({
            object_kind: 'issue',
            project: { id: Number(externalId), path_with_namespace: 'wh-it/gitlab' },
            object_attributes: { iid, title: `GitLab ${iid}`, description: 'desc', action, ...extra },
        });

        beforeAll(async () => {
            integrationId = await insertIntegration({
                provider: 'gitlab', projectId: goalId, repoFullName: 'wh-it/gitlab', repoExternalId: externalId, webhookSecret: SECRET,
            });
        });

        it('refuses a delivery without the token header', async () => {
            const response = await post('/module/integrations/webhook/gitlab', event(1, 'open'), {});
            expect(response.status).toBe(401);
        });

        it('refuses a wrong token', async () => {
            const response = await post('/module/integrations/webhook/gitlab', event(1, 'open'), { 'X-Gitlab-Token': 'nope' });
            expect(response.status).toBe(401);
            expect(await mappingsOf(integrationId)).toHaveLength(0);
        });

        it('acknowledges non-issue events without changes', async () => {
            const response = await post('/module/integrations/webhook/gitlab', { ...event(1, 'open'), object_kind: 'push' }, { 'X-Gitlab-Token': SECRET });
            expect(response.status).toBe(200);
            expect(await mappingsOf(integrationId)).toHaveLength(0);
        });

        it('finds the integration by the numeric project id, not the path', async () => {
            const response = await post('/module/integrations/webhook/gitlab', event(1, 'open'), { 'X-Gitlab-Token': SECRET });
            expect(response.status).toBe(200);

            const mapping = (await mappingsOf(integrationId))[0];
            expect(mapping).toMatchObject({ issue_number: 1, issue_state: 'open' });
            const task = (await tasksOfGoal(goalId)).find((t) => t.id === mapping.task_id);
            expect(task).toMatchObject({ description: 'GitLab 1', note: 'desc', source_url: `https://gitlab.com/wh-it/gitlab/-/issues/1` });
        });

        it('updates, closes and reopens with GitLab action names', async () => {
            await post('/module/integrations/webhook/gitlab', event(1, 'update', { title: 'GitLab renamed' }), { 'X-Gitlab-Token': SECRET });
            const mapping = (await mappingsOf(integrationId))[0];
            expect((await tasksOfGoal(goalId)).find((t) => t.id === mapping.task_id)?.description).toBe('GitLab renamed');

            await post('/module/integrations/webhook/gitlab', event(1, 'close'), { 'X-Gitlab-Token': SECRET });
            expect((await mappingsOf(integrationId))[0].issue_state).toBe('closed');

            await post('/module/integrations/webhook/gitlab', event(1, 'reopen'), { 'X-Gitlab-Token': SECRET });
            expect((await mappingsOf(integrationId))[0].issue_state).toBe('open');
        });
    });
});
