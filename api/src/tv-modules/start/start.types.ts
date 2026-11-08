import { type } from 'arktype';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { GoalAccess } from '../../core/GoalAccess';
import { TaskArkTypeDay } from '../tasks/tasks.server.types';

/** The longest period one calendar request may load: a month view with its leading and trailing weeks fits easily. */
export const CALENDAR_MAX_PERIOD_DAYS = 100;

export const FetchCalendarTasksArkType = type({
    from: TaskArkTypeDay,
    to: TaskArkTypeDay,
    'organizationId?': 'string.integer.parse',
}).narrow((query, ctx) => {
    const days = (Date.parse(`${query.to}T00:00:00Z`) - Date.parse(`${query.from}T00:00:00Z`)) / 86_400_000;
    if (days < 0) return ctx.mustBe('a period whose end is not before its start');
    return days <= CALENDAR_MAX_PERIOD_DAYS || ctx.mustBe(`a period of at most ${CALENDAR_MAX_PERIOD_DAYS} days`);
});

export type FetchCalendarTasksArgs = {
    from: string;
    to: string;
    organizationId?: number;
};

export type FetchTasksInPeriodArgs = {
    goalIds: number[];
    from: string;
    to: string;
};

export type StartVisibleTask = {
    goalId: number;
    tags: number[];
};

export type StartTasksVisibilityArgs<T extends StartVisibleTask> = {
    tasks: T[];
    access: GoalAccess;
};

export type SearchTaskArgs = {
    description: string;
    goalsIds: number[];
};

export type SearchTaskResult = TasksSchemaTypeForSelect & {
    tags: number[];
    assignedUsers: number[];
    historyId: number | null;
    subtasks: SearchTaskResult[];
};

export type FetchAllListsResult = {
    goalName: string | null;
    listName: string | null;
    listId: number | null;
    goalId: number;
};

export type UsersByProjectsFromDb = {
    id: number;
    name: string;
    user: { id: number; email: string }[];
};

export type AssigneesForTaskFromDb = {
    email: string;
    taskId: number;
    collabUserId: number;
};

export type StartTaskTagFromDb = {
    taskId: number;
    tagId: number;
};
