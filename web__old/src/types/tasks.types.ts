import type { GoalItem, GoalListItem, Task, TaskFilters } from 'taskview-api';

export type TaskItem = Task;

export type TaskItems = TaskItem[];

export type PartialSome<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PartialFetchRules = PartialSome<TasksStoreState['fetchRules'], 'currentPage' | 'endOfTasks'>;

export type TasksStoreState = {
    selectedTask?: Task | null;
    tasks: Task[];
    fetchRules: {
        goalId: GoalItem['id'];
        showCompleted: 1 | 0;
        currentListId: GoalListItem['id'];
        endOfTasks: boolean;
        currentPage: number;
        searchText: string;
        firstNew: 1 | 0;
        filters: TaskFilters;
    };
    loading: boolean;
};

export const PRIORITY_COLORS = {
    '1': { color: '#38D681', t: 'priority.low' },
    '2': { color: '#FF9100', t: 'priority.medium' },
    '3': { color: '#FF1744', t: 'priority.high' },
};

export const ALL_TASKS_LIST_ID = -1401;
