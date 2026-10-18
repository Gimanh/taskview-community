import axios, { type AxiosInstance } from 'axios';
import { and, eq } from 'drizzle-orm';
import fs from 'fs/promises';
import http from 'http';
import { join } from 'path';
import { TasksSchema, TasksToTagsSchema } from 'taskview-db-schemas';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { GoalPermissions } from '../../../types/auth.types';
import type { AutomationErrorCode, AutomationRuleForClient } from '../types';

type AutomationRuleResponse = { response: AutomationRuleForClient; code?: AutomationErrorCode; message?: string | null };

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1828;
const url = `http://localhost:${port}`;
const MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.69.0');
const LOGIN = 'test@mail.dest';
const PASSWORD = 'user1!#Q';

const api: AxiosInstance = axios.create({
    baseURL: url,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});

let server: http.Server;
let jwt = '';
let goalId = 0;
let otherGoalId = 0;
let doneColumnId = 0;
let reviewColumnId = 0;
let otherGoalColumnId = 0;
let tagId = 0;
const createdTokenIds: number[] = [];

const asUser = () => ({ headers: { Authorization: `Bearer ${jwt}` } });

async function createGoal(name: string): Promise<number> {
    const response = await api.post('/module/goals', { name: `${name}-${Date.now()}` }, asUser());
    expect(response.status).toBe(200);
    return response.data.response.id;
}

async function createColumn(inGoal: number, name: string): Promise<number> {
    const response = await api.post('/module/kanban/add-status', { goalId: inGoal, name }, asUser());
    expect(response.status).toBe(200);
    return response.data.response.id;
}

async function createTask(description: string): Promise<number> {
    const response = await api.post('/module/tasks', { goalId, description }, asUser());
    expect(response.status).toBe(200);
    return response.data.response.id;
}

async function createRule(body: Record<string, unknown>) {
    return api.post<AutomationRuleResponse>(`/module/automations/goal/${goalId}/rules`, body, asUser());
}

async function deleteAllRules() {
    const listed = await api.get<{ response: AutomationRuleForClient[] }>(`/module/automations/goal/${goalId}/rules`, asUser());
    for (const rule of listed.data.response ?? []) {
        await api.delete(`/module/automations/rule/${rule.id}`, asUser());
    }
}

async function fetchTask(taskId: number) {
    const rows = await Database.getInstance().dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, taskId));
    return rows[0];
}

async function taskHasTag(taskId: number): Promise<boolean> {
    const rows = await Database.getInstance()
        .dbDrizzle.select()
        .from(TasksToTagsSchema)
        .where(and(eq(TasksToTagsSchema.taskId, taskId), eq(TasksToTagsSchema.tagId, tagId)));
    return rows.length > 0;
}

async function waitFor(check: () => Promise<boolean>): Promise<boolean> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        if (await check()) return true;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
}

async function issueToken(allowedPermissions: string[]) {
    const response = await api.post('/module/api-tokens', { name: 'automations-probe', allowedPermissions, allowedGoalIds: [] }, asUser());
    expect(response.status).toBe(200);
    createdTokenIds.push(response.data.response.item.id);
    return { headers: { Authorization: `Bearer ${response.data.response.token}` } };
}

describe('Automations module', () => {
    beforeAll(async () => {
        const db = Database.getInstance();
        const client = await db.getClient();
        server = new App(port).listen();

        const login = await api.post('/module/auth/login', { login: LOGIN, password: PASSWORD });
        expect(login.status).toBe(200);
        jwt = login.data.access;

        // Other specs re-apply older all-triggers.sql in parallel; projects are created under the lock so they get this version's role grants.
        await client.query('SELECT pg_advisory_lock(1401067)');
        try {
            for (const file of (await fs.readdir(MIGRATION_DIR)).sort()) {
                await client.query(await fs.readFile(join(MIGRATION_DIR, file), 'utf-8'));
            }
            goalId = await createGoal('automations-it');
            otherGoalId = await createGoal('automations-it-other');
        } finally {
            await client.query('SELECT pg_advisory_unlock(1401067)');
            client.release();
        }

        doneColumnId = await createColumn(goalId, 'Done');
        reviewColumnId = await createColumn(goalId, 'Review');
        otherGoalColumnId = await createColumn(otherGoalId, 'Foreign');

        const tag = await api.post('/module/tags', { name: 'automated', color: '#22c55e', goalId }, asUser());
        expect(tag.status).toBe(200);
        tagId = tag.data.response.id;
    });

    afterAll(async () => {
        for (const id of [goalId, otherGoalId]) {
            if (id) await api.delete('/module/goals', { ...asUser(), data: { goalId: id } });
        }
        for (const id of createdTokenIds) {
            await api.delete('/module/api-tokens', { ...asUser(), data: { id } });
        }
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }, 30_000);

    it('seeds the automations permission group with localized descriptions', async () => {
        const result = await Database.getInstance().query<{ name: string; description_locales: Record<string, string> }>(
            'SELECT name, description_locales FROM tv_auth.permissions WHERE permission_group = 8 ORDER BY name'
        );
        expect(result.rows.map((r) => r.name)).toEqual(['automation_can_manage', 'automation_can_view']);
        expect(result.rows[0].description_locales.ru).toBeTruthy();
    });

    it('grants automation permissions to the roles of a new project', async () => {
        const result = await Database.getInstance().query<{ role: string; permission: string }>(
            `SELECT r.name AS role, p.name AS permission
             FROM collaboration.roles r
             JOIN collaboration.permissions_to_role pr ON pr.role_id = r.id
             JOIN tv_auth.permissions p ON p.id = pr.permission_id
             WHERE r.goal_id = $1 AND p.name LIKE 'automation_%'
             ORDER BY r.name, p.name`,
            [goalId]
        );
        const byRole = new Map<string, string[]>();
        for (const r of result.rows) byRole.set(r.role, [...(byRole.get(r.role) ?? []), r.permission]);
        expect(byRole.get('editor')).toEqual(['automation_can_manage', 'automation_can_view']);
        expect(byRole.get('executor')).toEqual(['automation_can_view']);
    });

    it('serves the catalog of modules, events and actions', async () => {
        const response = await api.get('/module/automations/catalog', asUser());
        expect(response.status).toBe(200);
        const modules = response.data.response.modules as { name: string; events: { name: string }[]; actions: { name: string }[] }[];
        expect(modules.map((m) => m.name)).toEqual(['tasks', 'kanban', 'lists', 'tags']);
        expect(modules.find((m) => m.name === 'kanban')?.actions.map((a) => a.name)).toEqual(['change.status']);
    });

    it('lists the options of a data source for the project only', async () => {
        const response = await api.get(`/module/automations/goal/${goalId}/options/kanban.statuses`, asUser());
        expect(response.status).toBe(200);
        const ids = (response.data.response as { id: number }[]).map((o) => o.id);
        expect(ids).toEqual(expect.arrayContaining([doneColumnId, reviewColumnId]));
        expect(ids).not.toContain(otherGoalColumnId);

        for (const source of ['unknown.source', 'constructor', '__proto__', 'hasOwnProperty']) {
            expect((await api.get(`/module/automations/goal/${goalId}/options/${source}`, asUser())).status).toBe(400);
        }
        expect((await api.get('/module/automations/catalog', asUser())).status).toBe(200);
    });

    it('hides data source options from users who cannot see that data', async () => {
        const automationsOnly = await issueToken([GoalPermissions.AUTOMATION_CAN_VIEW]);
        expect((await api.get(`/module/automations/goal/${goalId}/options/kanban.statuses`, automationsOnly)).status).toBe(403);
        expect((await api.get(`/module/automations/goal/${goalId}/options/tags.goalTags`, automationsOnly)).status).toBe(403);
    });

    it('refuses to move a task of another project through the kanban board', async () => {
        const otherTask = await api.post('/module/tasks', { goalId: otherGoalId, description: 'not yours to move' }, asUser());
        expect(otherTask.status).toBe(200);
        const otherTaskId = otherTask.data.response.id;

        const crossTask = await api.patch(
            '/module/kanban/update-tasks-order-and-column',
            { goalId, columnId: otherGoalColumnId, taskId: otherTaskId, prevTaskId: null, nextTaskId: null },
            asUser()
        );
        expect(crossTask.status).toBe(404);

        const ownTask = await createTask('stays in its project');
        const crossColumn = await api.patch(
            '/module/kanban/update-tasks-order-and-column',
            { goalId, columnId: otherGoalColumnId, taskId: ownTask, prevTaskId: null, nextTaskId: null },
            asUser()
        );
        expect(crossColumn.status).toBe(404);
        expect((await fetchTask(otherTaskId))?.statusId).toBeNull();
        expect((await fetchTask(ownTask))?.statusId).toBeNull();
    });

    it('adds a tag to new tasks through the idempotent insert', async () => {
        await deleteAllRules();
        const created = await createRule({
            name: 'Tag new tasks',
            trigger: { module: 'tasks', event: 'task.created' },
            action: { module: 'tags', action: 'add.tag', params: { tagId } },
        });
        expect(created.status).toBe(200);
        const tagged = await createTask('tagged by the rule');
        expect(await waitFor(() => taskHasTag(tagged))).toBe(true);
        await deleteAllRules();
    });

    it('moves a completed task to the Done column', async () => {
        await deleteAllRules();
        const created = await createRule({
            name: 'Completed to Done',
            trigger: { module: 'tasks', event: 'task.completed' },
            action: { module: 'kanban', action: 'change.status', params: { statusId: doneColumnId } },
        });
        expect(created.status).toBe(200);
        expect(created.data.response).toMatchObject({ goalId, enabled: true, action: { params: { statusId: doneColumnId } } });

        const taskId = await createTask('complete me');
        expect((await api.patch('/module/tasks', { id: taskId, complete: true }, asUser())).status).toBe(200);

        expect(await waitFor(async () => (await fetchTask(taskId))?.statusId === doneColumnId)).toBe(true);
    });

    it('fires column rules when a card is dragged on the kanban board', async () => {
        await deleteAllRules();
        const created = await createRule({
            name: 'Review gets tagged',
            trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: reviewColumnId } },
            action: { module: 'tags', action: 'add.tag', params: { tagId } },
        });
        expect(created.status).toBe(200);

        const taskId = await createTask('drag me');
        const moved = await api.patch(
            '/module/kanban/update-tasks-order-and-column',
            { goalId, columnId: reviewColumnId, taskId, prevTaskId: null, nextTaskId: null },
            asUser()
        );
        expect(moved.status).toBe(200);

        expect(await waitFor(() => taskHasTag(taskId))).toBe(true);
    });

    it('chains rules: Done column reopens the task that was just completed', async () => {
        await deleteAllRules();
        expect(
            (
                await createRule({
                    name: 'Completed to Done',
                    trigger: { module: 'tasks', event: 'task.completed' },
                    action: { module: 'kanban', action: 'change.status', params: { statusId: doneColumnId } },
                })
            ).status
        ).toBe(200);
        expect(
            (
                await createRule({
                    name: 'Done reopens',
                    trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: doneColumnId } },
                    action: { module: 'tasks', action: 'reopen' },
                })
            ).status
        ).toBe(200);

        const taskId = await createTask('chain me');
        expect((await api.patch('/module/tasks', { id: taskId, complete: true }, asUser())).status).toBe(200);

        expect(
            await waitFor(async () => {
                const task = await fetchTask(taskId);
                return task?.statusId === doneColumnId && task.complete === false;
            })
        ).toBe(true);
    });

    it('rejects a rule that closes an endless loop', async () => {
        const response = await createRule({
            name: 'Reopened completes again',
            trigger: { module: 'tasks', event: 'task.reopened' },
            action: { module: 'tasks', action: 'complete' },
        });
        expect(response.status).toBe(409);
        expect(response.data).toMatchObject({ code: 'cycle' });
        expect(response.data.message).toContain('Completed to Done');
    });

    it('allows the loop rule when it is saved disabled, and refuses to enable it', async () => {
        const created = await createRule({
            name: 'Reopened completes again',
            enabled: false,
            trigger: { module: 'tasks', event: 'task.reopened' },
            action: { module: 'tasks', action: 'complete' },
        });
        expect(created.status).toBe(200);

        const enabled = await api.patch(`/module/automations/rule/${created.data.response.id}`, { enabled: true }, asUser());
        expect(enabled.status).toBe(409);
        expect(enabled.data.code).toBe('cycle');
    });

    it('does not run disabled rules', async () => {
        await deleteAllRules();
        const created = await createRule({
            name: 'Disabled tagger',
            trigger: { module: 'tasks', event: 'task.created' },
            action: { module: 'tags', action: 'add.tag', params: { tagId } },
        });
        expect(created.status).toBe(200);
        const disabled = await api.patch(`/module/automations/rule/${created.data.response.id}`, { enabled: false }, asUser());
        expect(disabled.status).toBe(200);
        expect(disabled.data.response.enabled).toBe(false);

        const taskId = await createTask('no tag for me');
        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(await taskHasTag(taskId)).toBe(false);
    });

    it('rejects values from another project, unknown events and missing params', async () => {
        const foreign = await createRule({
            name: 'Foreign column',
            trigger: { module: 'tasks', event: 'task.completed' },
            action: { module: 'kanban', action: 'change.status', params: { statusId: otherGoalColumnId } },
        });
        expect(foreign.status).toBe(400);
        expect(foreign.data.code).toBe('invalid');

        const unknown = await createRule({
            name: 'Unknown',
            trigger: { module: 'tasks', event: 'task.exploded' },
            action: { module: 'tasks', action: 'complete' },
        });
        expect(unknown.status).toBe(400);

        const missing = await createRule({
            name: 'Missing column',
            trigger: { module: 'tasks', event: 'task.completed' },
            action: { module: 'kanban', action: 'change.status' },
        });
        expect(missing.status).toBe(400);

        const blankName = await createRule({
            name: '   ',
            trigger: { module: 'tasks', event: 'task.completed' },
            action: { module: 'tasks', action: 'reopen' },
        });
        expect(blankName.status).toBe(400);
    });

    it('drops undeclared params instead of storing them', async () => {
        await deleteAllRules();
        const created = await createRule({
            name: 'Extra params',
            trigger: { module: 'tasks', event: 'task.completed', params: { injected: 1 } },
            action: { module: 'kanban', action: 'change.status', params: { statusId: doneColumnId, goalId: otherGoalId } },
        });
        expect(created.status).toBe(200);
        expect(created.data.response.trigger.params).toEqual({});
        expect(created.data.response.action.params).toEqual({ statusId: doneColumnId });
    });

    it('lets a view-only token read rules but not change them', async () => {
        const viewer = await issueToken([GoalPermissions.AUTOMATION_CAN_VIEW]);
        expect((await api.get(`/module/automations/goal/${goalId}/rules`, viewer)).status).toBe(200);

        const created = await api.post(
            `/module/automations/goal/${goalId}/rules`,
            { name: 'Nope', trigger: { module: 'tasks', event: 'task.completed' }, action: { module: 'tasks', action: 'reopen' } },
            viewer
        );
        expect(created.status).toBe(403);

        const listed = await api.get<{ response: AutomationRuleForClient[] }>(`/module/automations/goal/${goalId}/rules`, asUser());
        const ruleId = listed.data.response[0].id;
        expect((await api.delete(`/module/automations/rule/${ruleId}`, viewer)).status).toBe(403);
    });

    it('refuses a rule whose action needs permissions the author lacks', async () => {
        const manager = await issueToken([GoalPermissions.AUTOMATION_CAN_VIEW, GoalPermissions.AUTOMATION_CAN_MANAGE]);
        const created = await api.post(
            `/module/automations/goal/${goalId}/rules`,
            {
                name: 'Escalation',
                trigger: { module: 'tasks', event: 'task.completed' },
                action: { module: 'kanban', action: 'change.status', params: { statusId: doneColumnId } },
            },
            manager
        );
        expect(created.status).toBe(403);
        expect(created.data.code).toBe('forbidden');
    });

    it('hides rules from users without access to the project', async () => {
        const noAccess = await issueToken([GoalPermissions.KANBAN_CAN_VIEW]);
        expect((await api.get(`/module/automations/goal/${goalId}/rules`, noAccess)).status).toBe(403);
        expect((await api.patch('/module/automations/rule/999999999', { enabled: false }, asUser())).status).toBe(404);
    });

    it('disables the rules that use a deleted column or tag', async () => {
        await deleteAllRules();
        const tempColumnId = await createColumn(goalId, 'Temporary');
        const tempTag = await api.post('/module/tags', { name: 'temporary', color: '#f97316', goalId }, asUser());
        expect(tempTag.status).toBe(200);
        const tempTagId: number = tempTag.data.response.id;

        const ruleIds: Record<string, number> = {};
        const rules = {
            moveToTemp: {
                trigger: { module: 'tasks', event: 'task.completed' },
                action: { module: 'kanban', action: 'change.status', params: { statusId: tempColumnId } },
            },
            fromTemp: {
                trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: tempColumnId } },
                action: { module: 'tags', action: 'add.tag', params: { tagId } },
            },
            addTempTag: {
                trigger: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: reviewColumnId } },
                action: { module: 'tags', action: 'add.tag', params: { tagId: tempTagId } },
            },
            unrelated: {
                trigger: { module: 'tasks', event: 'task.created' },
                action: { module: 'tags', action: 'add.tag', params: { tagId } },
            },
        };
        for (const [name, rule] of Object.entries(rules)) {
            const created = await createRule({ name, ...rule });
            expect(created.status).toBe(200);
            ruleIds[name] = created.data.response.id;
        }

        const enabledRules = async () => {
            const listed = await api.get<{ response: AutomationRuleForClient[] }>(`/module/automations/goal/${goalId}/rules`, asUser());
            return new Set(listed.data.response.filter((rule) => rule.enabled).map((rule) => rule.id));
        };

        expect((await api.post('/module/kanban/delete-status', { id: tempColumnId }, asUser())).status).toBe(200);
        expect(await waitFor(async () => !(await enabledRules()).has(ruleIds.moveToTemp))).toBe(true);
        expect(await enabledRules()).toEqual(new Set([ruleIds.addTempTag, ruleIds.unrelated]));

        expect((await api.delete('/module/tags', { ...asUser(), data: { tagId: tempTagId } })).status).toBe(200);
        expect(await waitFor(async () => !(await enabledRules()).has(ruleIds.addTempTag))).toBe(true);
        expect(await enabledRules()).toEqual(new Set([ruleIds.unrelated]));

        const reenabled = await api.patch(`/module/automations/rule/${ruleIds.moveToTemp}`, { enabled: true }, asUser());
        expect(reenabled.status).toBe(400);
        await deleteAllRules();
    });

    it('deletes a rule', async () => {
        await deleteAllRules();
        const created = await createRule({
            name: 'Short-lived',
            trigger: { module: 'tasks', event: 'task.completed' },
            action: { module: 'tasks', action: 'reopen' },
        });
        expect(created.status).toBe(200);
        expect((await api.delete(`/module/automations/rule/${created.data.response.id}`, asUser())).status).toBe(200);
        const listed = await api.get<{ response: AutomationRuleForClient[] }>(`/module/automations/goal/${goalId}/rules`, asUser());
        expect(listed.data.response).toEqual([]);
    });
});
