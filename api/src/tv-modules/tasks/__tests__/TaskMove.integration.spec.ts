import axios, { type AxiosInstance } from 'axios';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import http from 'http';
import {
    CollaborationUsersSchema,
    CollaborationUsersToGoalsSchema,
    FileToTaskSchema,
    FilesSchema,
    GoalsListSchema,
    GraphRelationsSchema,
    IntegrationTaskMapSchema,
    IntegrationsSchema,
    RecurrenceRulesSchema,
    SprintTaskOutcomesSchema,
    SprintsSchema,
    TagsSchema,
    TasksAssigneeSchema,
    TasksSchema,
    TasksStatusesSchema,
    TasksToTagsSchema,
    TimeEntriesSchema,
    UsersSchema,
} from 'taskview-db-schemas';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { GoalPermissions } from '../../../types/auth.types';
import { WebhooksRepository } from '../../webhooks/WebhooksRepository';
import type { TaskMovePreviewDto, TaskMoveResultDto } from '../task-move.types';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1826;
const api: AxiosInstance = axios.create({
    baseURL: `http://localhost:${port}`,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});
const db = () => Database.getInstance().dbDrizzle;

type Auth = { headers: { Authorization: string } };
type CreateTaskArgs = { goalId: number; description: string; parentId?: number; auth?: Auth };
type MoveArgs = { taskId: number; targetGoalId: number; auth?: Auth };
type SeededTree = { root: number; sub: number; subSub: number; outside: number; listId: number };

let server: http.Server;
let ownerAuth: Auth;
let userId = 0;
let goalA = 0;
let goalB = 0;
let otherOrgId = 0;
let goalOtherOrg = 0;
const tokenIds: number[] = [];

async function createGoal(name: string, organizationId?: number): Promise<number> {
    const response = await api.post('/module/goals', { name: `${name}-${Date.now()}`, organizationId }, ownerAuth);
    expect(response.status).toBe(200);
    return response.data.response.id;
}

async function createTask(args: CreateTaskArgs): Promise<number> {
    const response = await api.post('/module/tasks', { goalId: args.goalId, description: args.description, parentId: args.parentId }, args.auth ?? ownerAuth);
    expect(response.status).toBe(200);
    return response.data.response[0]?.id ?? response.data.response.id;
}

function preview(args: MoveArgs) {
    return api.get<{ response: TaskMovePreviewDto }>(`/module/tasks/${args.taskId}/move-preview?targetGoalId=${args.targetGoalId}`, args.auth ?? ownerAuth);
}

function move(args: MoveArgs) {
    return api.post<{ response: TaskMoveResultDto }>('/module/tasks/move', { taskId: args.taskId, targetGoalId: args.targetGoalId }, args.auth ?? ownerAuth);
}

async function tokenWithout(excluded: string[]): Promise<Auth> {
    const allowedPermissions = Object.values(GoalPermissions).filter((p) => !excluded.includes(p));
    const response = await api.post('/module/api-tokens', { name: `move-${Date.now()}`, allowedPermissions, allowedGoalIds: [] }, ownerAuth);
    expect(response.status).toBe(200);
    tokenIds.push(response.data.response.item.id);
    return { headers: { Authorization: `Bearer ${response.data.response.token}` } };
}

async function taskRow(id: number) {
    const [row] = await db().select().from(TasksSchema).where(eq(TasksSchema.id, id));
    return row;
}

// Root with a two-level subtask tree, everything a task can be bound to in its project, and a sibling task the
// root depends on
async function seedTree(): Promise<SeededTree> {
    const root = await createTask({ goalId: goalA, description: 'root to move' });
    const sub = await createTask({ goalId: goalA, description: 'subtask', parentId: root });
    const subSub = await createTask({ goalId: goalA, description: 'sub-subtask', parentId: sub });
    const outside = await createTask({ goalId: goalA, description: 'stays in A' });

    const [list] = await db().insert(GoalsListSchema).values({ name: 'List A', goalId: goalA, creatorId: userId }).returning();
    const [status] = await db().insert(TasksStatusesSchema).values({ name: 'Doing', goalId: goalA }).returning();
    const [sprint] = await db().insert(SprintsSchema).values({ goalId: goalA, name: 'S1', startDate: '2026-01-01', endDate: '2026-01-14' }).returning();
    const [rule] = await db()
        .insert(RecurrenceRulesSchema)
        .values({ goalId: goalA, rrule: 'FREQ=DAILY', dtstart: new Date(), timezone: 'UTC', lastInstanceDate: '2026-01-01', creatorId: userId, templateTaskId: root })
        .returning();
    await db()
        .update(TasksSchema)
        .set({ goalListId: list.id, statusId: status.id, sprintId: sprint.id, recurrenceRuleId: rule.id, nodeGraphPosition: { x: 1, y: 2 } })
        .where(eq(TasksSchema.id, root));

    const [tag] = await db().insert(TagsSchema).values({ name: `tag-${Date.now()}`, color: '#000000', owner: userId, goalId: goalA }).returning();
    await db().insert(TasksToTagsSchema).values({ taskId: root, tagId: tag.id });
    const [collaborator] = await db().insert(CollaborationUsersSchema).values({ email: `assignee-${Date.now()}@test.dest` }).returning();
    await db().insert(CollaborationUsersToGoalsSchema).values({ userId: collaborator.id, goalId: goalA });
    await db().insert(TasksAssigneeSchema).values({ taskId: root, collabUserId: collaborator.id });
    const fileId = randomUUID();
    await db().insert(FilesSchema).values({
        id: fileId, goalId: goalA, uploaderId: userId, uploaderEmail: 'test@mail.dest', name: 'a.txt', originalName: 'a.txt',
        mimeType: 'text/plain', sizeBytes: 1, checksumSha256: '0'.repeat(64), storageProvider: 'local', storageKey: `${goalA}/${fileId}`,
    });
    await db().insert(FileToTaskSchema).values({ fileId, taskId: root, linkedById: userId, linkedByEmail: 'test@mail.dest' });
    await db().insert(SprintTaskOutcomesSchema).values({ sprintId: sprint.id, taskId: root, outcome: 'accepted' });
    const [integration] = await db().insert(IntegrationsSchema).values({ provider: 'github', projectId: goalA }).returning();
    await db().insert(IntegrationTaskMapSchema).values({ integrationId: integration.id, taskId: root, issueNumber: 1 });
    await db().insert(GraphRelationsSchema).values([
        { fromTaskId: root, toTaskId: sub, goalId: goalA },
        { fromTaskId: root, toTaskId: outside, goalId: goalA },
    ]);
    await db().insert(TimeEntriesSchema).values({ taskId: root, goalId: goalA, userId, startedAt: new Date(), endedAt: new Date(), durationSeconds: 60 });

    return { root, sub, subSub, outside, listId: list.id };
}

describe('Moving a task to another project', () => {
    beforeAll(async () => {
        server = new App(port).listen();
        const login = await api.post('/module/auth/login', { login: 'test@mail.dest', password: 'user1!#Q' });
        expect(login.status).toBe(200);
        ownerAuth = { headers: { Authorization: `Bearer ${login.data.access}` } };
        const [user] = await db().select({ id: UsersSchema.id }).from(UsersSchema).where(eq(UsersSchema.email, 'test@mail.dest'));
        userId = user.id;

        goalA = await createGoal('move-A');
        goalB = await createGoal('move-B');
        const org = await api.post('/module/organizations', { name: `move-org-${Date.now()}` }, ownerAuth);
        expect(org.status).toBe(200);
        otherOrgId = org.data.response.id;
        goalOtherOrg = await createGoal('move-other-org', otherOrgId);
    });

    afterAll(async () => {
        for (const id of tokenIds) await api.delete('/module/api-tokens', { ...ownerAuth, data: { id } });
        for (const goalId of [goalA, goalB, goalOtherOrg]) if (goalId) await api.delete('/module/goals', { ...ownerAuth, data: { goalId } });
        if (otherOrgId) await api.delete(`/module/organizations/${otherOrgId}`, ownerAuth);
        if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    }, 30_000);

    it('previews and moves the whole tree, detaching everything bound to the old project', async () => {
        const tree = await seedTree();
        const ids = [tree.root, tree.sub, tree.subSub];

        const shown = await preview({ taskId: tree.root, targetGoalId: goalB });
        expect(shown.status).toBe(200);
        expect(shown.data.response).toEqual({
            allowed: true,
            reason: null,
            mode: 'move',
            tasks: 3,
            timeEntries: 1,
            removals: { tags: 1, assignees: 1, fileLinks: 1, dependencies: 1, sprintOutcomes: 1, integrationLinks: 1, recurrence: 1 },
            leftBehind: { subtasks: 0, timeEntries: 0 },
        });

        const moved = await move({ taskId: tree.root, targetGoalId: goalB });
        expect(moved.status).toBe(200);
        expect(moved.data.response).toEqual({ mode: 'move', taskId: tree.root, goalId: goalB });

        const rows = await db().select().from(TasksSchema).where(inArray(TasksSchema.id, ids));
        for (const row of rows) expect(row.goalId).toBe(goalB);
        const root = await taskRow(tree.root);
        expect(root).toMatchObject({ goalListId: null, statusId: null, sprintId: null, recurrenceRuleId: null, nodeGraphPosition: null, parentId: null });
        expect((await taskRow(tree.subSub)).parentId).toBe(tree.sub);

        for (const table of [TasksToTagsSchema, TasksAssigneeSchema, FileToTaskSchema, SprintTaskOutcomesSchema, IntegrationTaskMapSchema]) {
            expect(await db().select().from(table).where(inArray(table.taskId, ids))).toEqual([]);
        }
        const edges = await db().select().from(GraphRelationsSchema).where(eq(GraphRelationsSchema.fromTaskId, tree.root));
        expect(edges.map((e) => [e.toTaskId, e.goalId])).toEqual([[tree.sub, goalB]]);
        const [entry] = await db().select().from(TimeEntriesSchema).where(eq(TimeEntriesSchema.taskId, tree.root));
        expect(entry.goalId).toBe(goalB);
        const [rule] = await db().select().from(RecurrenceRulesSchema).where(eq(RecurrenceRulesSchema.goalId, goalA));
        expect(rule.templateTaskId).toBeNull();
        // Files are not moved: they stay in the old project, only the link is gone
        expect(await db().select().from(FilesSchema).where(eq(FilesSchema.goalId, goalA))).toHaveLength(1);
        // The task the root depended on stays where it was
        expect((await taskRow(tree.outside)).goalId).toBe(goalA);
    });

    it('refuses an update that points the moved task back at a list of the old project', async () => {
        const task = await createTask({ goalId: goalA, description: 'list probe' });
        const [listB] = await db().insert(GoalsListSchema).values({ name: 'List B', goalId: goalB, creatorId: userId }).returning();
        const response = await api.patch('/module/tasks', { id: task, goalListId: listB.id }, ownerAuth);
        expect(response.status).toBe(400);
        expect((await taskRow(task)).goalId).toBe(goalA);

        const [statusB] = await db().insert(TasksStatusesSchema).values({ name: 'B col', goalId: goalB }).returning();
        expect((await api.patch('/module/tasks', { id: task, statusId: statusB.id }, ownerAuth)).status).toBe(400);
        const foreignParent = await createTask({ goalId: goalB, description: 'foreign parent' });
        expect((await api.patch('/module/tasks', { id: task, parentId: foreignParent }, ownerAuth)).status).toBe(400);
        expect((await api.patch('/module/tasks', { id: task, parentId: task }, ownerAuth)).status).toBe(400);
    });

    it('does not move the task back when a history version from before the move is restored', async () => {
        const task = await createTask({ goalId: goalA, description: 'history before' });
        await api.patch('/module/tasks', { id: task, description: 'history edited in A' }, ownerAuth);
        expect((await move({ taskId: task, targetGoalId: goalB })).status).toBe(200);

        const history = await api.get(`/module/tasks/${task}/history`, ownerAuth);
        const versions = history.data.response.history as { historyId: number | null; goalId: number }[];
        const fromA = versions.find((h) => h.historyId && h.goalId === goalA);
        expect(fromA).toBeTruthy();
        const restored = await api.post(`/module/tasks/${task}/restore/${fromA?.historyId}`, {}, ownerAuth);
        expect(restored.status).toBe(200);
        expect((await taskRow(task)).goalId).toBe(goalB);
    });

    it.each([
        ['a subtask on its own', 'sub', 'is_subtask', 400],
        ['to the same project', 'same', 'same_project', 400],
        ['to a project of another organization', 'other-org', 'other_organization', 400],
    ] as const)('refuses moving %s', async (_label, kind, reason, status) => {
        const root = await createTask({ goalId: goalA, description: `refuse ${kind}` });
        const sub = await createTask({ goalId: goalA, description: 'child', parentId: root });
        const args = {
            sub: { taskId: sub, targetGoalId: goalB },
            same: { taskId: root, targetGoalId: goalA },
            'other-org': { taskId: root, targetGoalId: goalOtherOrg },
        }[kind];
        expect((await preview(args)).data.response).toMatchObject({ allowed: false, reason });
        const response = await move(args);
        expect(response.status).toBe(status);
        expect(response.data).toBe(reason);
        expect((await taskRow(root)).goalId).toBe(goalA);
    });

    it('copies the task when the user may not delete tasks in the source project, leaving the original untouched', async () => {
        const auth = await tokenWithout([GoalPermissions.TASKS_CAN_DELETE]);
        const tree = await seedTree();

        expect((await preview({ taskId: tree.root, targetGoalId: goalB, auth })).data.response).toMatchObject({ allowed: true, mode: 'copy', tasks: 3, timeEntries: 0 });
        const copied = await move({ taskId: tree.root, targetGoalId: goalB, auth });
        expect(copied.status).toBe(200);
        expect(copied.data.response.mode).toBe('copy');
        const copyRootId = copied.data.response.taskId;
        expect(copyRootId).not.toBe(tree.root);

        // The original keeps its project, tags and time
        expect((await taskRow(tree.root)).goalId).toBe(goalA);
        expect(await db().select().from(TasksToTagsSchema).where(eq(TasksToTagsSchema.taskId, tree.root))).toHaveLength(1);
        expect(await db().select().from(TimeEntriesSchema).where(eq(TimeEntriesSchema.taskId, tree.root))).toHaveLength(1);

        // The copy: same content and subtree in B, nothing project-bound, no logged time
        const copyRoot = await taskRow(copyRootId);
        expect(copyRoot).toMatchObject({ goalId: goalB, description: 'root to move', goalListId: null, statusId: null, parentId: null });
        const copySubs = await db().select().from(TasksSchema).where(eq(TasksSchema.parentId, copyRootId));
        expect(copySubs.map((t) => t.description)).toEqual(['subtask']);
        const copySubSubs = await db().select().from(TasksSchema).where(eq(TasksSchema.parentId, copySubs[0].id));
        expect(copySubSubs.map((t) => [t.description, t.goalId])).toEqual([['sub-subtask', goalB]]);
        expect(await db().select().from(TasksToTagsSchema).where(eq(TasksToTagsSchema.taskId, copyRootId))).toEqual([]);
        expect(await db().select().from(TimeEntriesSchema).where(eq(TimeEntriesSchema.taskId, copyRootId))).toEqual([]);
        const copiedEdges = await db().select().from(GraphRelationsSchema).where(eq(GraphRelationsSchema.fromTaskId, copyRootId));
        expect(copiedEdges.map((e) => [e.toTaskId, e.goalId])).toEqual([[copySubs[0].id, goalB]]);
    });

    it('leaves the subtasks in the old project as standalone tasks without the subtask permission in the target', async () => {
        const auth = await tokenWithout([GoalPermissions.TASKS_CAN_ADD_SUBTASKS]);
        const root = await createTask({ goalId: goalA, description: 'root without subtasks' });
        const sub = await createTask({ goalId: goalA, description: 'left behind', parentId: root });
        const subSub = await createTask({ goalId: goalA, description: 'left behind child', parentId: sub });

        expect((await preview({ taskId: root, targetGoalId: goalB, auth })).data.response).toMatchObject({ tasks: 1, leftBehind: { subtasks: 2 } });
        expect((await move({ taskId: root, targetGoalId: goalB, auth })).status).toBe(200);

        expect((await taskRow(root)).goalId).toBe(goalB);
        expect(await taskRow(sub)).toMatchObject({ goalId: goalA, parentId: null });
        expect(await taskRow(subSub)).toMatchObject({ goalId: goalA, parentId: sub });
    });

    it('moves only the user\'s own logged time with the log permission, other people\'s stays in the old project', async () => {
        const auth = await tokenWithout([GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL]);
        const root = await createTask({ goalId: goalA, description: 'time split' });
        // A dedicated second user: picking an existing row raced with specs that delete their users in parallel
        const [someoneElse] = await db()
            .insert(UsersSchema)
            .values({ login: `move-time-${Date.now()}`, email: `move-time-${Date.now()}@mail.dest`, password: 'not-used', block: 0 })
            .returning({ id: UsersSchema.id });
        try {
            await db().insert(TimeEntriesSchema).values([
                { taskId: root, goalId: goalA, userId, startedAt: new Date(), endedAt: new Date(), durationSeconds: 30 },
                { taskId: root, goalId: goalA, userId: someoneElse.id, startedAt: new Date(), endedAt: new Date(), durationSeconds: 30 },
            ]);

            expect((await move({ taskId: root, targetGoalId: goalB, auth })).status).toBe(200);
            const entries = await db().select().from(TimeEntriesSchema).where(eq(TimeEntriesSchema.taskId, root));
            expect(entries.find((e) => e.userId === userId)?.goalId).toBe(goalB);
            expect(entries.find((e) => e.userId === someoneElse.id)?.goalId).toBe(goalA);
        } finally {
            await db().delete(UsersSchema).where(eq(UsersSchema.id, someoneElse.id));
        }
    });

    it('notifies the webhooks of both projects about the move', async () => {
        const savedAllowPrivate = process.env.WEBHOOKS_ALLOW_PRIVATE_URLS;
        process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = 'true';
        const webhookIds: number[] = [];
        try {
            for (const goalId of [goalA, goalB]) {
                const created = await api.post('/module/webhooks', { goalId, url: 'http://127.0.0.1:9/hook', events: ['task.moved'] }, ownerAuth);
                expect(created.status).toBe(200);
                webhookIds.push(created.data.response.webhook.id);
            }
            const task = await createTask({ goalId: goalA, description: 'announced move' });
            expect((await move({ taskId: task, targetGoalId: goalB })).status).toBe(200);

            const repository = new WebhooksRepository();
            for (const webhookId of webhookIds) {
                let deliveries = await repository.fetchDeliveries(webhookId);
                for (let attempt = 0; attempt < 50 && deliveries.length === 0; attempt++) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    deliveries = await repository.fetchDeliveries(webhookId);
                }
                expect(deliveries).toHaveLength(1);
                expect(deliveries[0].payload).toMatchObject({ event: 'task.moved', taskIds: [task], fromGoalId: goalA, toGoalId: goalB });
            }
        } finally {
            for (const id of webhookIds) await api.delete('/module/webhooks', { ...ownerAuth, data: { id } });
            if (savedAllowPrivate === undefined) delete process.env.WEBHOOKS_ALLOW_PRIVATE_URLS;
            else process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = savedAllowPrivate;
        }
    });
});
