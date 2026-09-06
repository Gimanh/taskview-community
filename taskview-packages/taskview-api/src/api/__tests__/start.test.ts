import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
} from 'vitest';
import { initApi } from './init-api';
import { ymd } from './test-helpers';

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
