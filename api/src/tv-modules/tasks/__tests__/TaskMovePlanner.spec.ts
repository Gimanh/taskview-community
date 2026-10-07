import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { describe, expect, it } from 'vitest';
import { GoalPermissionsChecker } from '../../../core/GoalPermissionsChecker';
import { GoalPermissions, type GoalPermissionType } from '../../../types/auth.types';
import { TaskMovePlanner } from '../TaskMovePlanner';
import type { TaskMoveRepository } from '../TaskMoveRepository';
import type { TaskMoveContext, TaskMoveRemovals, TaskMoveTimeEntryCountArgs } from '../task-move.types';

const USER_ID = 7;
const SOURCE = 10;
const TARGET = 20;
const ROOT = 100;
const SUBTASKS = [101, 102];

const REMOVALS: TaskMoveRemovals = { tags: 2, assignees: 1, fileLinks: 3, dependencies: 1, sprintOutcomes: 0, integrationLinks: 1, recurrence: 1 };

type FakeSetup = {
    context?: TaskMoveContext | null;
    source?: GoalPermissionType[];
    target?: GoalPermissionType[];
    // entries per user id, for every task of the plan
    timeEntries?: Record<number, number>;
};

const ALL_SOURCE = [GoalPermissions.COMPONENT_CAN_WATCH_CONTENT, GoalPermissions.TASKS_CAN_DELETE];
const ALL_TARGET = [
    GoalPermissions.COMPONENT_CAN_ADD_TASKS,
    GoalPermissions.TASKS_CAN_ADD_SUBTASKS,
    GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL,
];

function context(overrides: Partial<TasksSchemaTypeForSelect> = {}, targetOrganizationId = 1): TaskMoveContext {
    return {
        task: { id: ROOT, goalId: SOURCE, parentId: null, ...overrides } as TasksSchemaTypeForSelect,
        sourceOrganizationId: 1,
        target: { id: TARGET, organizationId: targetOrganizationId, ownerId: 3 },
    };
}

function planner(setup: FakeSetup = {}) {
    const entries = setup.timeEntries ?? { [USER_ID]: 2, 8: 5 };
    const repository = {
        fetchContext: async () => (setup.context === undefined ? context() : setup.context),
        fetchSubtaskIds: async () => SUBTASKS,
        countRemovals: async () => REMOVALS,
        countTimeEntries: async (args: TaskMoveTimeEntryCountArgs) =>
            Object.entries(entries)
                .filter(([userId]) => args.userIds === null || args.userIds.includes(Number(userId)))
                .reduce((sum, [, n]) => sum + n, 0),
    } as unknown as TaskMoveRepository;
    const checkers: Record<number, GoalPermissionType[]> = { [SOURCE]: setup.source ?? ALL_SOURCE, [TARGET]: setup.target ?? ALL_TARGET };
    return new TaskMovePlanner({
        repository,
        userId: USER_ID,
        checkerForGoal: async (goalId) =>
            new GoalPermissionsChecker((checkers[goalId] ?? []).map((permissionName, i) => ({ permissionName, permissionId: i }))),
    });
}

const move = { taskId: ROOT, targetGoalId: TARGET };

describe('TaskMovePlanner', () => {
    it('moves the task with its subtasks and everyone\'s time when all permissions are there', async () => {
        const decision = await planner().plan(move);
        expect(decision).toEqual({
            ok: true,
            plan: {
                mode: 'move',
                rootTaskId: ROOT,
                sourceGoalId: SOURCE,
                targetGoalId: TARGET,
                targetGoalOwnerId: 3,
                taskIds: [ROOT, ...SUBTASKS],
                leftBehindSubtaskIds: [],
                timeEntryUserIds: null,
                removals: REMOVALS,
                leftBehind: { subtasks: 0, timeEntries: 0 },
                movedTimeEntries: 7,
            },
        });
    });

    it('copies instead of moving when the user may not delete tasks in the source project', async () => {
        const decision = await planner({ source: [GoalPermissions.COMPONENT_CAN_WATCH_CONTENT] }).plan(move);
        expect(decision.ok && decision.plan.mode).toBe('copy');
        // A copy never takes logged time: it would be counted twice
        expect(decision.ok && decision.plan.timeEntryUserIds).toEqual([]);
        expect(decision.ok && decision.plan.movedTimeEntries).toBe(0);
        expect(decision.ok && decision.plan.leftBehind.timeEntries).toBe(0);
    });

    it('leaves the subtasks behind without the subtask permission in the target project', async () => {
        const decision = await planner({ target: [GoalPermissions.COMPONENT_CAN_ADD_TASKS, GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL] }).plan(move);
        expect(decision.ok && decision.plan.taskIds).toEqual([ROOT]);
        expect(decision.ok && decision.plan.leftBehindSubtaskIds).toEqual(SUBTASKS);
        expect(decision.ok && decision.plan.leftBehind.subtasks).toBe(2);
    });

    it('moves only the user\'s own time with the log permission, and none without time permissions', async () => {
        const own = await planner({
            target: [GoalPermissions.COMPONENT_CAN_ADD_TASKS, GoalPermissions.TASKS_CAN_ADD_SUBTASKS, GoalPermissions.TIMETRACKING_CAN_LOG],
        }).plan(move);
        expect(own.ok && own.plan.timeEntryUserIds).toEqual([USER_ID]);
        expect(own.ok && own.plan.movedTimeEntries).toBe(2);
        expect(own.ok && own.plan.leftBehind.timeEntries).toBe(5);

        const none = await planner({ target: [GoalPermissions.COMPONENT_CAN_ADD_TASKS, GoalPermissions.TASKS_CAN_ADD_SUBTASKS] }).plan(move);
        expect(none.ok && none.plan.timeEntryUserIds).toEqual([]);
        expect(none.ok && none.plan.leftBehind.timeEntries).toBe(7);
    });

    it.each([
        ['an unknown task', { context: null }, 'not_found'],
        ['a task the user cannot see (reported as not found)', { source: [] }, 'not_found'],
        ['a subtask', { context: context({ parentId: 55 }) }, 'is_subtask'],
        ['the same project', { context: { ...context(), target: { id: SOURCE, organizationId: 1, ownerId: 3 } } }, 'same_project'],
        ['a project of another organization', { context: context({}, 2) }, 'other_organization'],
        ['a target without the right to add tasks', { target: [GoalPermissions.TASKS_CAN_ADD_SUBTASKS] }, 'no_target_permission'],
    ] as const)('refuses %s', async (_label, setup, reason) => {
        expect(await planner(setup as FakeSetup).plan(move)).toEqual({ ok: false, reason });
    });

    it('turns a decision into the preview the client shows', async () => {
        const p = planner({ target: [GoalPermissions.COMPONENT_CAN_ADD_TASKS, GoalPermissions.TIMETRACKING_CAN_LOG] });
        expect(p.toPreview(await p.plan(move))).toEqual({
            allowed: true,
            reason: null,
            mode: 'move',
            tasks: 1,
            timeEntries: 2,
            removals: REMOVALS,
            leftBehind: { subtasks: 2, timeEntries: 5 },
        });
        expect(p.toPreview({ ok: false, reason: 'same_project' })).toEqual({
            allowed: false,
            reason: 'same_project',
            mode: null,
            tasks: 0,
            timeEntries: 0,
            removals: null,
            leftBehind: null,
        });
    });
});
