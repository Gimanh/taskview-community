import { type } from 'arktype';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { GoalPermissionsChecker } from '../../core/GoalPermissionsChecker';
import type { TaskMoveRepository } from './TaskMoveRepository';

const NumberFromString = type('string | number').pipe((v) => Number(v));

export const TaskArkTypeMove = type({
    taskId: 'number',
    targetGoalId: 'number',
});
export type TaskArgMove = typeof TaskArkTypeMove.infer;

export const TaskArkTypeMovePreview = type({
    taskId: NumberFromString,
    targetGoalId: NumberFromString,
});

export type TaskMoveMode = 'move' | 'copy';

export type TaskMoveBlockReason =
    | 'not_found'
    | 'same_project'
    | 'other_organization'
    | 'is_subtask'
    | 'no_target_permission';

export type TaskMoveRemovals = {
    tags: number;
    assignees: number;
    fileLinks: number;
    dependencies: number;
    sprintOutcomes: number;
    integrationLinks: number;
    recurrence: number;
};

export type TaskMoveLeftBehind = {
    subtasks: number;
    timeEntries: number;
};

export type TaskMovePlan = {
    mode: TaskMoveMode;
    rootTaskId: number;
    sourceGoalId: number;
    targetGoalId: number;
    targetGoalOwnerId: number;
    // Root first, then subtasks parent-before-child; only the tasks that go to the target project
    taskIds: number[];
    // Subtasks staying in the source project (they become standalone tasks there when the root moves)
    leftBehindSubtaskIds: number[];
    // Time entries move only in 'move' mode, and only those of the users listed here (null = everyone's)
    timeEntryUserIds: number[] | null;
    removals: TaskMoveRemovals;
    leftBehind: TaskMoveLeftBehind;
    movedTimeEntries: number;
};

export type TaskMoveDecision = { ok: true; plan: TaskMovePlan } | { ok: false; reason: TaskMoveBlockReason };

export type TaskMovePreviewDto = {
    allowed: boolean;
    reason: TaskMoveBlockReason | null;
    mode: TaskMoveMode | null;
    tasks: number;
    timeEntries: number;
    removals: TaskMoveRemovals | null;
    leftBehind: TaskMoveLeftBehind | null;
};

export type TaskMoveResultDto = {
    mode: TaskMoveMode;
    taskId: number;
    goalId: number;
};

export type TaskMoveOutcome = { ok: true; data: TaskMoveResultDto } | { ok: false; reason: TaskMoveBlockReason };

export type TaskMoveContext = {
    task: TasksSchemaTypeForSelect;
    sourceOrganizationId: number | null;
    target: { id: number; organizationId: number | null; ownerId: number } | null;
};

export type TaskMoveContextArgs = {
    taskId: number;
    targetGoalId: number;
};

export type TaskMoveCountArgs = {
    taskIds: number[];
};

export type TaskMoveTimeEntryCountArgs = {
    taskIds: number[];
    userIds: number[] | null;
};

export type TaskMoveExecuteArgs = {
    plan: TaskMovePlan;
};

export type TaskCopyExecuteArgs = {
    plan: TaskMovePlan;
    creatorId: number;
};

export type TaskCopyResult = {
    rootTaskId: number;
    tasks: TasksSchemaTypeForSelect[];
};

export type TaskMovePlannerArgs = {
    repository: TaskMoveRepository;
    userId: number;
    checkerForGoal: (goalId: number) => Promise<GoalPermissionsChecker>;
};
