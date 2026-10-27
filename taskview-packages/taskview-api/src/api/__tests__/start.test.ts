import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
} from 'vitest';
import axios from 'axios';
import { API_URL, initApi } from './init-api';
import { ymd } from './test-helpers';
import { openTestDb } from './test-db';
import { createSessionUser } from './auth-test-helpers';
import type { AuthTestContext } from './auth-test-helpers.types';

/**
 * The main screen endpoint. It answers "what do I have today" in one request and
 * splits the day server-side in the caller's timezone — the reason a client must
 * not fetch every project and compare deadlines itself.
 */
describe('Start screen state', () => {
    let $api: TvApi;
    let goalId: number;

    beforeAll(async () => {
        const { $tvApi } = await initApi();
        $api = $tvApi;

        const goal = await $api.goals.createGoal({ name: `Agenda test-${Date.now()}` });
        goalId = goal!.id!;
    });

    afterAll(async () => {
        await $api.goals.deleteGoal(goalId).catch(() => {});
    });

    it('returns every bucket the main screen shows', async () => {
        const state = await $api.start.fetchAllState({ tz: 'UTC' });

        expect(state).toBeDefined();
        expect(Array.isArray(state!.tasksToday)).toBe(true);
        expect(Array.isArray(state!.tasksUpcoming)).toBe(true);
        expect(Array.isArray(state!.tasksLastCompleted)).toBe(true);
        expect(Array.isArray(state!.tasks)).toBe(true);
    });

    it('puts a task due today into tasksToday', async () => {
        const task = await $api.tasks.createTask({
            goalId,
            description: `Due today-${Date.now()}`,
        });
        await $api.tasks.updateTask({ id: task!.id, endDate: ymd(0) });

        const state = await $api.start.fetchAllState({ tz: 'UTC' });

        expect(state!.tasksToday.some((t) => t.id === task!.id)).toBe(true);
        expect(state!.tasksUpcoming.some((t) => t.id === task!.id)).toBe(false);
    });

    it('puts a task due later into tasksUpcoming', async () => {
        const task = await $api.tasks.createTask({
            goalId,
            description: `Due later-${Date.now()}`,
        });
        await $api.tasks.updateTask({ id: task!.id, endDate: ymd(7) });

        const state = await $api.start.fetchAllState({ tz: 'UTC' });

        expect(state!.tasksUpcoming.some((t) => t.id === task!.id)).toBe(true);
        expect(state!.tasksToday.some((t) => t.id === task!.id)).toBe(false);
    });

    it('keeps a task with no deadline out of both dated buckets', async () => {
        const task = await $api.tasks.createTask({
            goalId,
            description: `No deadline-${Date.now()}`,
        });

        const state = await $api.start.fetchAllState({ tz: 'UTC' });

        expect(state!.tasksToday.some((t) => t.id === task!.id)).toBe(false);
        expect(state!.tasksUpcoming.some((t) => t.id === task!.id)).toBe(false);
    });

    it('requires a timezone — the split is meaningless without one', async () => {
        const status = await $api.start
            .fetchAllState({ tz: '' })
            .then(() => 200)
            .catch((err) => err.status ?? err.response?.status);

        expect(status).toBe(400);
    });
});

/**
 * The "recent tasks" bucket lists tasks without a deadline, newest first. A fresh
 * user keeps it free of tasks other specs create in parallel.
 */
describe('Start screen recent tasks', () => {
    const ctx = {} as AuthTestContext;
    let $userApi: TvApi;
    let goalId: number;

    beforeAll(async () => {
        const init = await initApi();
        ctx.ownerApi = init.$tvApi;
        ctx.db = await openTestDb();
        const org = await ctx.ownerApi.organizations.create({ name: `Recent tasks org ${Date.now()}` });
        ctx.orgId = org.id;

        const user = await createSessionUser({ ctx, prefix: 'rec' });
        $userApi = new TvApi(axios.create({
            baseURL: API_URL,
            headers: { Authorization: `Bearer ${user.access}` },
        }));
        const goal = await $userApi.goals.createGoal({ name: `Recent tasks-${Date.now()}` });
        goalId = goal!.id!;
    });

    afterAll(async () => {
        await $userApi.goals.deleteGoal(goalId).catch(() => {});
        await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {});
        await ctx.db.end();
    });

    it('lists the last added task first, whatever the priority, including one whose deadline was removed', async () => {
        const highPriority = await $userApi.tasks.createTask({ goalId, description: 'Older, high priority', priorityId: 3 });
        const lowPriority = await $userApi.tasks.createTask({ goalId, description: 'Newer, low priority', priorityId: 1 });
        const wasToday = await $userApi.tasks.createTask({ goalId, description: 'Added to today', endDate: ymd(0) });
        await $userApi.tasks.updateTask({ id: wasToday!.id, endDate: null });

        const state = await $userApi.start.fetchAllState({ tz: 'UTC' });

        expect(state!.tasks.map((t) => t.id)).toEqual([wasToday!.id, lowPriority!.id, highPriority!.id]);
        expect(state!.tasksToday.some((t) => t.id === wasToday!.id)).toBe(false);
    });
});
