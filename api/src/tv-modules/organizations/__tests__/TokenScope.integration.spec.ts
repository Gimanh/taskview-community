import axios from 'axios';
import fs from 'fs/promises';
import type http from 'http';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { GoalPermissions } from '../../../types/auth.types';

const port = 1811;
const url = `http://localhost:${port}`;
const MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.65.0');

const LOGIN = 'test@mail.dest';
const PASSWORD = 'user1!#Q';

let server: http.Server;
let jwt = '';
const createdTokenIds: number[] = [];
const createdOrgIds: number[] = [];
let ownedGoalId = 0;

const api = axios.create({ baseURL: url, validateStatus: () => true });

const asUser = () => ({ headers: { Authorization: `Bearer ${jwt}` } });

async function issueToken(allowedPermissions: string[]) {
    const response = await api.post(
        '/module/api-tokens',
        { name: 'scope-probe', allowedPermissions, allowedGoalIds: [] },
        asUser(),
    );
    expect(response.status).toBe(200);
    createdTokenIds.push(response.data.response.item.id);
    return { headers: { Authorization: `Bearer ${response.data.response.token}` } };
}

async function createOrg(auth: { headers: Record<string, string> }, name: string) {
    const response = await api.post('/module/organizations', { name }, auth);
    const id = response.data?.response?.id;
    if (id) createdOrgIds.push(id);
    return response;
}

describe('API token scope on organization-level surfaces', () => {
    vi.mock('emailjs', () => ({
        SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
    }));

    beforeAll(async () => {
        const db = Database.getInstance();
        const client = await db.getClient();
        for (const file of (await fs.readdir(MIGRATION_DIR)).sort()) {
            await client.query(await fs.readFile(join(MIGRATION_DIR, file), 'utf-8'));
        }
        client.release();

        server = new App(port).listen();

        const login = await api.post('/module/auth/login', { login: LOGIN, password: PASSWORD });
        expect(login.status).toBe(200);
        jwt = login.data.access;

        // A goal the caller actually owns: otherwise IsGoalOwnerByGoalId answers 403
        // on its own and the webhook tests below would pass without the token check.
        const goal = await api.post('/module/goals', { name: `scope-goal-${Date.now()}` }, asUser());
        expect(goal.status).toBe(200);
        ownedGoalId = goal.data.response.id;
    });

    afterAll(async () => {
        if (ownedGoalId) {
            await api.delete('/module/goals', { ...asUser(), data: { goalId: ownedGoalId } });
        }
        for (const id of createdOrgIds) {
            await api.delete(`/module/organizations/${id}`, asUser());
        }
        for (const id of createdTokenIds) {
            await api.delete('/module/api-tokens', { ...asUser(), data: { id } });
        }
        server?.close();
    });

    it('seeds the organization permission group', async () => {
        const db = Database.getInstance();
        const result = await db.query<{ name: string }>(
            'SELECT name FROM tv_auth.permissions WHERE permission_group = 6 ORDER BY name',
        );
        expect(result?.rows.map((row) => row.name)).toEqual([
            'org_can_manage', 'org_can_manage_members', 'org_can_view', 'sso_can_manage', 'webhooks_can_manage',
        ]);
    });

    it('offers the new permissions for selection, with localized descriptions', async () => {
        const response = await api.get('/module/api-tokens/permissions', asUser());

        expect(response.status).toBe(200);
        const rows = response.data.response as {
            name: string;
            permissionGroup: number;
            descriptionLocales: Record<string, string> | null;
        }[];

        const orgView = rows.find((row) => row.name === 'org_can_view');
        expect(orgView?.permissionGroup).toBe(6);
        expect(orgView?.descriptionLocales?.ru).toBeTruthy();

        // Group 1 is enforced nowhere, so it must not be offered as a restriction.
        expect(rows.some((row) => row.permissionGroup === 1)).toBe(false);
    });

    it('blocks a narrowly scoped token from creating an organization', async () => {
        const token = await issueToken([GoalPermissions.TIMETRACKING_CAN_VIEW]);

        const response = await createOrg(token, 'scope-probe-denied');

        expect(response.status).toBe(403);
    });

    it('allows a token that was given org_can_manage', async () => {
        const token = await issueToken([GoalPermissions.ORG_CAN_MANAGE]);

        const response = await createOrg(token, 'scope-probe-allowed');

        expect(response.status).toBe(200);
    });

    it('keeps an unrestricted token working, so existing integrations do not break', async () => {
        const token = await issueToken([]);

        const response = await createOrg(token, 'scope-probe-unrestricted');

        expect(response.status).toBe(200);
    });

    it('does not restrict a browser session', async () => {
        const response = await createOrg(asUser(), 'scope-probe-session');

        expect(response.status).toBe(200);
    });

    it('separates managing the organization from managing its members', async () => {
        const token = await issueToken([GoalPermissions.ORG_CAN_MANAGE]);
        const org = await createOrg(token, 'scope-probe-members');
        expect(org.status).toBe(200);

        const response = await api.post(
            '/module/organizations/members',
            { organizationId: org.data.response.id, email: LOGIN, role: 'admin' },
            token,
        );

        expect(response.status).toBe(403);
    });

    it('lets a token holding org_can_manage_members add one', async () => {
        const owner = await issueToken([GoalPermissions.ORG_CAN_MANAGE]);
        const org = await createOrg(owner, 'scope-probe-members-ok');
        expect(org.status).toBe(200);

        const member = await issueToken([GoalPermissions.ORG_CAN_MANAGE_MEMBERS]);
        const response = await api.post(
            '/module/organizations/members',
            { organizationId: org.data.response.id, email: `member-${Date.now()}@test.dest`, role: 'member' },
            member,
        );

        // A precise status, not merely "not 403" — that would also pass on a 500.
        expect(response.status).toBe(200);
    });

    it('blocks a narrowly scoped token from reaching webhooks of a goal it owns', async () => {
        const token = await issueToken([GoalPermissions.TIMETRACKING_CAN_VIEW]);

        const response = await api.get(`/module/webhooks?goalId=${ownedGoalId}`, token);

        expect(response.status).toBe(403);
    });

    it('lets webhooks_can_manage through on that same goal, proving the 403 came from the token', async () => {
        const token = await issueToken([GoalPermissions.WEBHOOKS_CAN_MANAGE]);

        const response = await api.get(`/module/webhooks?goalId=${ownedGoalId}`, token);

        expect(response.status).toBe(200);
    });
});
