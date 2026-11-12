import { type } from 'arktype';
import { DateTime, IANAZone } from 'luxon';
import type { StartDashboardBucket } from 'taskview-api';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { GoalAccess } from '../../core/GoalAccess';
import { TaskArkTypeDay } from '../tasks/tasks.server.types';
import type { StartDashboardTaskPicker } from './StartDashboardTaskPicker';

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

export type StartWeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TimezoneArkType = type('string').narrow(
    (value, ctx) => IANAZone.isValidZone(value) || ctx.mustBe('a valid IANA timezone')
);

export const FetchDashboardArkType = type({
    tz: TimezoneArkType,
    'weekStart?': type('string.integer.parse').narrow(
        (value, ctx): value is StartWeekStart =>
            (value >= 0 && value <= 6) || ctx.mustBe('a day of the week from 0 to 6')
    ),
    'organizationId?': 'string.integer.parse',
});

export type FetchDashboardArgs = {
    tz: string;
    weekStart?: StartWeekStart;
    organizationId?: number;
};

export const FetchDashboardTasksArkType = type({
    tz: TimezoneArkType,
    bucket: "'overdue' | 'day' | 'week'",
    'date?': type('string').narrow(
        (value, ctx) =>
            (/^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value).isValid) || ctx.mustBe('a date as YYYY-MM-DD')
    ),
    'offset?': type('string.integer.parse').narrow((value, ctx) => value >= 0 || ctx.mustBe('zero or more')),
    'limit?': type('string.integer.parse').narrow((value, ctx) => value >= 1 || ctx.mustBe('one or more')),
    'organizationId?': 'string.integer.parse',
});

export type FetchDashboardTasksArgs = {
    tz: string;
    bucket: StartDashboardBucket;
    /** The day of a `day` column or the first day of a `week` column, YYYY-MM-DD */
    date?: string;
    offset: number;
    limit: number;
    organizationId?: number;
};

/** The projects a dashboard is counted in, and where the caller may see assignees and priorities */
export type StartDashboardScope = {
    goalIds: number[];
    assigneeGoalIds: number[];
    priorityGoalIds: number[];
};

export type StartDashboardTaskPickerArgs = StartDashboardClockArgs & {
    bucket: StartDashboardBucket;
    date?: string;
};

export type FetchDashboardDeadlineRangeArgs = {
    goalIds: number[];
    /** First deadline day to consider, YYYY-MM-DD; any earlier day when omitted */
    from?: string;
    /** Last deadline day to consider, YYYY-MM-DD */
    until: string;
};

export type FetchDashboardCompletedRangeArgs = {
    goalIds: number[];
    from: Date;
    /** Not included */
    to: Date;
    limit: number;
    offset: number;
};

export type StartDashboardCompletedTask = {
    id: number;
    goalId: number;
    dateComplete: Date | null;
};

/** A listed task before its title and assignee are loaded */
export type StartDashboardListedTask = {
    id: number;
    goalId: number;
    daysLate: number;
    completedOn: string | null;
};

export type StartDashboardListedPage = {
    total: number;
    listed: StartDashboardListedTask[];
};

export type FetchDashboardListArgs = {
    scope: StartDashboardScope;
    picker: StartDashboardTaskPicker;
    args: FetchDashboardTasksArgs;
};

export type FetchDashboardTaskDetailsArgs = {
    scope: StartDashboardScope;
    taskIds: number[];
};

/** Open tasks that share a project, a deadline and a priority, counted in the database */
export type StartDashboardOpenGroup = {
    goalId: number;
    endDate: string | null;
    endTime: string | null;
    priorityId: 1 | 2 | 3 | null;
    count: number;
};

/** Open tasks of one assignee that share a project and a deadline; `email` is null for tasks nobody is assigned to */
export type StartDashboardWorkloadGroup = {
    goalId: number;
    email: string | null;
    endDate: string | null;
    endTime: string | null;
    count: number;
};

export type StartDashboardDeadline = {
    endDate: string | null;
    endTime: string | null;
};

export type StartDashboardAttentionCandidate = {
    id: number;
    goalId: number;
    endDate: string | null;
    endTime: string | null;
};

export type StartDashboardGoalCount = {
    goalId: number;
    done: number;
};

export type StartDashboardTaskDescription = {
    id: number;
    description: string | null;
};

export type StartDashboardAssignee = {
    taskId: number;
    email: string;
};

export type FetchDashboardCompletedArgs = {
    goalIds: number[];
    since: Date;
};

export type FetchDashboardAttentionArgs = {
    goalIds: number[];
    /** Last deadline day to consider, YYYY-MM-DD */
    until: string;
    limit: number;
};

export type FetchDashboardTasksByIdArgs = {
    goalIds: number[];
    taskIds: number[];
};

export type StartDashboardClockArgs = {
    now: Date;
    tz: string;
};

export type StartDashboardBuildArgs = StartDashboardClockArgs & {
    weekStart: StartWeekStart;
    openGroups: StartDashboardOpenGroup[];
    /** Only from the projects in `assigneeGoalIds` */
    workloadGroups: StartDashboardWorkloadGroup[];
    /** The open tasks with the earliest deadlines; the listed ones are picked among them */
    attentionCandidates: StartDashboardAttentionCandidate[];
    goalCounts: StartDashboardGoalCount[];
    completedDates: Date[];
    /** Projects where the caller may see who a task is assigned to */
    assigneeGoalIds: ReadonlySet<number>;
    /** Projects where the caller may see task priorities */
    priorityGoalIds: ReadonlySet<number>;
};

/** What is loaded only for the few tasks the dashboard lists by name */
export type StartDashboardAttentionDetails = {
    descriptions: ReadonlyMap<number, string>;
    /** The first assignee of a task, for tasks of projects where assignees are visible */
    emails: ReadonlyMap<number, string>;
};
