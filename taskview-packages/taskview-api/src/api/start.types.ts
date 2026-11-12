import type { Task } from './tasks.api.types';

export type StartScreenUsers = {
    id: number;
    name: string;
    users: { id: number; email: string }[];
}[];

export type StartScreenAssignees = {
    taskId: Task['id'];
    collabUserId: number;
    email: string;
}[];

/** Everything the main screen shows, split server-side in the caller's timezone. */
export type StartScreenState = {
    tasks: Task[];
    tasksToday: Task[];
    tasksUpcoming: Task[];
    tasksLastCompleted: Task[];
    users: StartScreenUsers;
    assignees: StartScreenAssignees;
    listToGoal: Record<number, number>;
};

export type StartStateArgs = {
    /** IANA timezone, e.g. "Europe/Belgrade". The API rejects the request without it. */
    tz: string;
    organizationId?: number;
};

export type StartCalendarArgs = {
    /** First day of the period, YYYY-MM-DD, inclusive */
    from: string;
    /** Last day of the period, YYYY-MM-DD, inclusive; at most 100 days after `from` */
    to: string;
    organizationId?: number;
};

export type StartDashboardArgs = {
    /** IANA timezone, e.g. "Europe/Belgrade": "today" and the weeks are counted in it. */
    tz: string;
    /** First day of the week, 0 = Sunday; Monday when omitted. */
    weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    organizationId?: number;
};

export type StartDashboardTotals = {
    total: number;
    done: number;
    open: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    undated: number;
};

export type StartDashboardDay = {
    /** YYYY-MM-DD */
    date: string;
    count: number;
};

export type StartDashboardWeek = {
    /** First day of the week, YYYY-MM-DD */
    start: string;
    count: number;
};

export type StartDashboardAttentionTask = {
    id: Task['id'];
    goalId: number;
    description: string;
    /** Whole days past the deadline; 0 when it passed earlier today, -1 when the task is due today and still on time */
    daysLate: number;
    /** Empty when the caller may not see assignees in the task's project */
    assigneeEmail: string | null;
};

/** A column of the dashboard: the overdue tasks, the tasks due on a day, the tasks completed in a week */
export type StartDashboardBucket = 'overdue' | 'day' | 'week';

export type StartDashboardTasksArgs = {
    /** IANA timezone the dashboard was counted in */
    tz: string;
    bucket: StartDashboardBucket;
    /** The day of a `day` column or the first day of a `week` column, YYYY-MM-DD; not used for `overdue` */
    date?: string;
    /** How many tasks to skip, for the next page */
    offset?: number;
    /** 50 when omitted, 100 at most */
    limit?: number;
    organizationId?: number;
};

export type StartDashboardBucketTask = StartDashboardAttentionTask & {
    /** The caller's day the task was completed on, YYYY-MM-DD; null for open tasks */
    completedOn: string | null;
};

export type StartDashboardTaskList = {
    tasks: StartDashboardBucketTask[];
    /** All tasks of the column, not only the returned page */
    total: number;
};

export type StartDashboardWorkloadRow = {
    /** null stands for tasks without an assignee */
    email: string | null;
    open: number;
    overdue: number;
};

export type StartDashboardPriority = {
    /** 0 stands for tasks without a priority */
    id: 0 | 1 | 2 | 3;
    count: number;
};

export type StartDashboardProject = {
    goalId: number;
    total: number;
    done: number;
    open: number;
    overdue: number;
};

/** Counters across every project the caller can see, for the dashboard on the main screen. Top-level tasks only. */
export type StartDashboard = {
    /** The caller's current day, YYYY-MM-DD */
    today: string;
    totals: StartDashboardTotals;
    /** How many weeks back the pace looks, and how many tasks were completed in them */
    paceWindowWeeks: number;
    completedInPaceWindow: number;
    /** Tasks completed in the window of the same length right before the pace window, to tell whether the pace is rising */
    completedInPreviousPaceWindow: number;
    completedLast7Days: number;
    /** Open tasks that are still on time, by due date, starting today */
    runway: StartDashboardDay[];
    /** Completed tasks per week, oldest first; the last one is the current week */
    weeks: StartDashboardWeek[];
    attention: StartDashboardAttentionTask[];
    attentionTotal: number;
    /** Projects where the caller may not see assignees are left out; null when there is no such project at all */
    workload: StartDashboardWorkloadRow[] | null;
    /** The projects the workload is counted in, so the hours shown next to it can be asked for the same projects */
    workloadGoalIds: number[];
    /** Projects where the caller may not see priorities are left out; null when there is no such project at all */
    priorities: StartDashboardPriority[] | null;
    projects: StartDashboardProject[];
};
