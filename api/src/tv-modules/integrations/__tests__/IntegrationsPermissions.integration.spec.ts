import http from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { cleanupGoal, createApi, insertIntegration, loginAndCreateGoal } from './support';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1817;
const api = createApi(port);
const FOREIGN_GOAL = 999_999_999;
const MISSING_INTEGRATION = 999_999_999;

let server: http.Server;
let jwt = '';
let goalId = 0;
let integrationId = 0;

const auth = () => ({ headers: { Authorization: `Bearer ${jwt}` } });

/**
 * Every management route is guarded by the project's INTEGRATIONS_CAN_VIEW /
 * INTEGRATIONS_CAN_MANAGE permission. When a route names an integration, the
 * project is derived from it and a projectId the caller sends is ignored.
 */
describe('Integrations route permissions', () => {
    beforeAll(async () => {
        process.env.ENCRYPTION_KEY ??= 'ab'.repeat(32);
        server = new App(port).listen();
        ({ jwt, goalId } = await loginAndCreateGoal(api, `integrations-perm-it-${Date.now()}`));
        integrationId = await insertIntegration({ provider: 'github', projectId: goalId });
    });

    afterAll(async () => {
        await cleanupGoal(api, jwt, goalId);
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    describe('anonymous callers', () => {
        it.each([
            ['GET', '/module/integrations?projectId=1'],
            ['POST', '/module/integrations'],
            ['DELETE', '/module/integrations'],
            ['PATCH', '/module/integrations/toggle'],
            ['PATCH', '/module/integrations/select-repo'],
            ['POST', '/module/integrations/sync'],
            ['GET', '/module/integrations/repos?integrationId=1'],
        ])('%s %s answers 401', async (method, url) => {
            const response = await api.request({ method, url, data: { projectId: goalId, id: integrationId, integrationId } });
            expect(response.status).toBe(401);
        });
    });

    describe('project-scoped routes', () => {
        it('lists integrations of a project the user can view', async () => {
            const response = await api.get(`/module/integrations?projectId=${goalId}`, auth());
            expect(response.status).toBe(200);
            expect(response.data.response.map((i: { id: number }) => i.id)).toContain(integrationId);
        });

        it('refuses a project the user has no role in', async () => {
            expect((await api.get(`/module/integrations?projectId=${FOREIGN_GOAL}`, auth())).status).toBe(403);
            const create = await api.post('/module/integrations', { provider: 'github', repoFullName: 'a/b', projectId: FOREIGN_GOAL }, auth());
            expect(create.status).toBe(403);
        });

        it('rejects a request that names no project at all', async () => {
            expect((await api.get('/module/integrations', auth())).status).toBe(400);
        });
    });

    describe('integration-scoped routes', () => {
        it('derives the project from the integration and ignores a foreign projectId in the query', async () => {
            const response = await api.get(`/module/integrations/repos?integrationId=${integrationId}&projectId=${FOREIGN_GOAL}`, auth());
            expect(response.status).toBe(200);
            expect(response.data.response).toEqual([]);
        });

        it('cannot be talked into a project the user owns by naming an integration that does not exist', async () => {
            const response = await api.get(`/module/integrations/repos?integrationId=${MISSING_INTEGRATION}&projectId=${goalId}`, auth());
            expect(response.status).toBe(400);
        });

        it.each([
            ['toggle', 'patch', '/module/integrations/toggle', { id: MISSING_INTEGRATION, isActive: false }],
            ['select-repo', 'patch', '/module/integrations/select-repo', { integrationId: MISSING_INTEGRATION, repoFullName: 'a/b', repoExternalId: '1' }],
            ['sync', 'post', '/module/integrations/sync', { integrationId: MISSING_INTEGRATION }],
            ['delete', 'delete', '/module/integrations', { id: MISSING_INTEGRATION }],
        ])('%s of a missing integration answers 400 rather than leaking whether it exists elsewhere', async (_name, method, url, body) => {
            const response = await api.request({ method, url, data: body, ...auth() });
            expect(response.status).toBe(400);
        });

        it('lets a manager pause and resume an integration of their project', async () => {
            const paused = await api.patch('/module/integrations/toggle', { id: integrationId, isActive: false }, auth());
            expect(paused.status).toBe(200);
            expect(paused.data.response.isActive).toBe(false);

            const resumed = await api.patch('/module/integrations/toggle', { id: integrationId, isActive: true }, auth());
            expect(resumed.data.response.isActive).toBe(true);
        });
    });

    describe('inbound webhooks', () => {
        it('never require a user session, only the provider signature', async () => {
            const response = await api.post('/module/integrations/webhook/github', { action: 'opened' }, { headers: { 'X-GitHub-Event': 'issues' } });
            expect(response.status).toBe(401);
            expect(response.data).toBe('Missing signature');
        });
    });
});
