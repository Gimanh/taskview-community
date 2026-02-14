export const TaskIncomeType = 1;
export const TaskExpenseType = 0;
export type TaskTransactionTypes = typeof TaskIncomeType | typeof TaskExpenseType | null;

export interface TaskBase {
    id: number;
    description: string;
    complete: boolean;
    owner: number;
    parentId: number | null;
    goalListId: number | null;
    note: string | null;
    subtasks: Task[];
    priorityId: 1 | 2 | 3;

    dateComplete: string | null;
    dateCreation: string;

    startDate: string | null;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;

    goalId: number;
    statusId: number | null;
    taskOrder: number | null;
    kanbanOrder: number | null;

    amount: number | string | null;
    transactionType: TaskTransactionTypes;
    nodeGraphPosition: Record<'x' | 'y', number> | null;
    creatorId: number | null;
}

export interface Task extends TaskBase {
    tags: number[];
    historyId: null | number;
    assignedUsers: number[];
};

// we can not update defined fields
type NotAllowedToUpdate = 'id' | 'goalId' | 'owner' | 'dateCreation' | 'dateComplete' | 'historyId';

export type TaskArgUpdate = Pick<Task, 'id'> & Partial<Omit<Task, NotAllowedToUpdate>>;
export type TaskResponseUpdate = Task | null;

export type TaskArgAdd = Pick<Task, 'goalId' | 'description'>
    & Partial<Omit<Task, NotAllowedToUpdate | 'subtasks' | 'tags' | 'assignedUsers' | 'creatorId' | 'amount'>>
    & { amount?: number | string | null };

export type TaskResponseAdd = Task | null;

export type TaskArgDelete = number;

export type TaskResponseDelete = {
    delete: boolean;
};

export type TaskResponseFetchById = Task | null;

export const ALL_TASKS_LIST_ID = -1401;

export type TaskFilters = {
    selectedUser?: number;
    priority?: number;
    selectedTags?: Record<string, true>;
};

export type TaskArgFetch = {
    goalId: number;
    componentId: number | typeof ALL_TASKS_LIST_ID;
    page: number;
    showCompleted: 0 | 1;
    firstNew: 0 | 1;
    searchText?: string;
    filters?: TaskFilters;
    unlimited?: boolean;
    ignoreCompleted?: boolean;
};

export type TaskResponseFetch = Task[];


export type TaskArgToggleAssignee = {
    taskId: number;
    userIds: number[];
};

export type TaskResponseToggleAssignee = {
    userIds: number[];
};


export type TaskResponseFetchTaskHistory = { history: Task[] };

export type TaskResponseRecoveryTaskHistory = { recovery: boolean };