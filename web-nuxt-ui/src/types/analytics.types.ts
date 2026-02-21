import type { GoalItem } from 'taskview-api'
import type { CollaborationUsers } from './collaboration.types'
import type { AppResponse } from './global-app.types'
import type { TaskItem } from './tasks.types'

export type AnalyticsStoreState = {
    loading: boolean;
    tasks: TaskItem[];
    users: CollaborationUsers;
    tasksForProject: TaskItem[];
};

export type FetchAnalyticsDataResponse = AppResponse<{
    tasks: AnalyticsStoreState['tasks'];
    users: CollaborationUsers;
}>;

export type FetchAnalyticsTasksArg = { startDate: string; endDate: string };

export type FetchAnalyticsForProject = {
    goalId: GoalItem['id'];
    dates: FetchAnalyticsTasksArg;
};
