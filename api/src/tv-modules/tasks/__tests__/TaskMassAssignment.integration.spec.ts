import axios from 'axios';
import type http from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import AuthModel from '../../auth/AuthModel';
import { ALL_TASKS_LIST_ID } from '../../../types/tasks.types';

// End-to-end reproduction of the mass-assignment report: an authenticated user who may
// edit their own task injects goalId / creatorId / sprintId into PATCH /module/tasks and
// tries to move the task into another user's goal. Runs through the real middleware,
// controller, ORM and DB triggers, so it needs the vitest PostgreSQL (see vitest.config.ts).

const port = 1813;
const url = `http://localhost:${port}`;
const PASSWORD = 'user1!#Q';
const VICTIM_LOGIN = 'test@mail.dest';

const api = axios.create({ baseURL: url, validateStatus: () => true });
const auth = (jwt: string) => ({ headers: { Authorization: `Bearer ${jwt}` } });

let server: http.Server;
let victimJwt = '';
let victimUserId = 0;
let attackerJwt = '';
let attackerEmail = '';
let victimGoalId = 0;
let victimTaskId = 0;
let attackerGoalId = 0;
let attackerTaskId = 0;
let attackerListId = 0;

async function taskRow(id: number) {
    const result = await Database.getInstance().query<{ goal_id: number; creator_id: number | null; sprint_id: number | null; description: string }>(
        'SELECT goal_id, creator_id, sprint_id, description FROM tasks.tasks WHERE id = $1',
        [id],
    );
    return result.rows[0];
}

async function listRow(id: number) {
    const result = await Database.getInstance().query<{ goal_id: number; owner: number | null; archive: number; name: string }>(
        'SELECT goal_id, owner, archive, name FROM tasks.goal_lists WHERE id = $1',
        [id],
    );
    return result.rows[0];
}

async function registerAndLogin(email: string): Promise<string> {
    const registration = await api.post('/module/auth/registration', { email, password: PASSWORD, passwordRepeat: PASSWORD });
    expect(registration.status).toBe(200);

    const user = await new AuthModel().getUserByLogin(email, true);
    if (!user) throw new Error(`registered user ${email} not found`);
    const confirm = await api.get(`/module/auth/confirm/email/${user.confirm_email_code}/login/${user.login}`);
    expect(confirm.status).toBe(200);

    const login = await api.post('/module/auth/login', { login: email, password: PASSWORD });
    expect(login.status).toBe(200);
    return login.data.access as string;
}

async function createGoal(jwt: string, name: string): Promise<number> {
    const response = await api.post('/module/goals', { name }, auth(jwt));
    expect(response.status).toBe(200);
    return response.data.response.id as number;
}

async function createTask(jwt: string, goalId: number, description: string): Promise<number> {
    const response = await api.post('/module/tasks', { goalId, description }, auth(jwt));
    expect(response.status).toBe(200);
    return response.data.response.id as number;
}

describe('PATCH /module/tasks and /module/goal_lists mass assignment (integration)', () => {
    vi.mock('emailjs', () => ({
        SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
    }));
    vi.mock('../../../core/Email', () => ({
        Email: { send: vi.fn().mockResolvedValue(true) },
    }));

    beforeAll(async () => {
        server = new App(port).listen();

        const victimLogin = await api.post('/module/auth/login', { login: VICTIM_LOGIN, password: PASSWORD });
        expect(victimLogin.status).toBe(200);
        victimJwt = victimLogin.data.access;
        victimUserId = victimLogin.data.userData.id;

        attackerEmail = `${Date.now()}attacker@mail.dest`;
        attackerJwt = await registerAndLogin(attackerEmail);

        victimGoalId = await createGoal(victimJwt, `victim-goal-${Date.now()}`);
        victimTaskId = await createTask(victimJwt, victimGoalId, 'victim-owned task');

        attackerGoalId = await createGoal(attackerJwt, `attacker-goal-${Date.now()}`);
        attackerTaskId = await createTask(attackerJwt, attackerGoalId, 'attacker task');

        const list = await api.post('/module/goal_lists', { name: 'attacker list', goalId: attackerGoalId }, auth(attackerJwt));
        expect(list.status).toBe(200);
        attackerListId = list.data.response.id;
    });

    afterAll(async () => {
        if (attackerGoalId) await api.delete('/module/goals', { ...auth(attackerJwt), data: { goalId: attackerGoalId } });
        if (victimGoalId) await api.delete('/module/goals', { ...auth(victimJwt), data: { goalId: victimGoalId } });
        if (attackerEmail) await Database.getInstance().query('DELETE FROM tv_auth.users WHERE email = $1', [attackerEmail]);
        server?.close();
    });

    it('control: the attacker can edit a declared field on their own task', async () => {
        const response = await api.patch('/module/tasks', { id: attackerTaskId, description: 'neg-control-no-goalid' }, auth(attackerJwt));

        expect(response.status).toBe(200);
        const row = await taskRow(attackerTaskId);
        expect(row.description).toBe('neg-control-no-goalid');
        expect(row.goal_id).toBe(attackerGoalId);
    });

    it("control: the attacker cannot edit the victim's task at all", async () => {
        const response = await api.patch('/module/tasks', { id: victimTaskId, description: 'alice-hijack-attempt' }, auth(attackerJwt));

        expect(response.status).toBe(403);
        expect((await taskRow(victimTaskId)).description).toBe('victim-owned task');
    });

    it("attack: injected goalId / creatorId / sprintId do not move the task into the victim's goal", async () => {
        const before = await taskRow(attackerTaskId);

        const response = await api.patch(
            '/module/tasks',
            {
                id: attackerTaskId,
                description: 'pwned-cross-org',
                kanbanOrder: 500000,
                goalId: victimGoalId,
                creatorId: victimUserId,
                sprintId: 424242,
            },
            auth(attackerJwt),
        );

        expect(response.status).toBe(200);
        expect(response.data.response.goalId).toBe(attackerGoalId);

        const after = await taskRow(attackerTaskId);
        expect(after.goal_id).toBe(attackerGoalId);
        expect(after.creator_id).toBe(before.creator_id);
        expect(after.sprint_id).toBe(before.sprint_id);
        expect(after.description).toBe('pwned-cross-org');
    });

    it("victim's task list does not contain the attacker's task", async () => {
        const response = await api.get('/module/tasks', {
            ...auth(victimJwt),
            params: { goalId: victimGoalId, componentId: ALL_TASKS_LIST_ID, page: 0, showCompleted: 0, firstNew: 0 },
        });

        expect(response.status).toBe(200);
        const body = response.data.response;
        const tasks: { id: number }[] = Array.isArray(body) ? body : (body?.tasks ?? []);
        expect(tasks.map((task) => task.id)).toContain(victimTaskId);
        expect(tasks.map((task) => task.id)).not.toContain(attackerTaskId);
    });

    it("attack: injected goalId / owner / archive do not move the list into the victim's goal", async () => {
        const before = await listRow(attackerListId);

        const response = await api.patch(
            '/module/goal_lists',
            { id: attackerListId, name: 'pwned list', goalId: victimGoalId, owner: victimUserId, archive: 1 },
            auth(attackerJwt),
        );

        expect(response.status).toBe(200);
        const after = await listRow(attackerListId);
        expect(after.goal_id).toBe(attackerGoalId);
        expect(after.owner).toBe(before.owner);
        expect(after.archive).toBe(before.archive);
        expect(after.name).toBe('pwned list');
    });
});
