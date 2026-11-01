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
    sourceUrl: string | null;

    sprintId: number | null;
    estimateValue: number | string | null;

    recurrenceRuleId: number | null;
    recurrenceInstanceDate: string | null;
}

export interface Task extends TaskBase {
    tags: number[];
    historyId: null | number;
    assignedUsers: number[];
    filesCount?: number;
};

// we can not update defined fields
// sprintId is managed via the sprints module; dateComplete is trigger-maintained.
// recurrence fields are managed via the recurrence module.
type NotAllowedToUpdate = 'id' | 'goalId' | 'owner' | 'dateCreation' | 'dateComplete' | 'historyId' | 'sprintId' | 'recurrenceRuleId' | 'recurrenceInstanceDate';

export type TaskArgUpdate = Pick<Task, 'id'> & Partial<Omit<Task, NotAllowedToUpdate>>;
export type TaskResponseUpdate = (Task & { syncFailed?: boolean }) | null;

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
    /** Any of these assignees; 0 stands for tasks without an assignee */
    assignees?: number[];
    /** Any of these kanban statuses; 0 stands for tasks without a status */
    statuses?: number[];
    /** Any of these priorities; 0 stands for tasks without a priority */
    priorities?: Array<0 | 1 | 2 | 3>;
};

export type TaskSortBy = 'date' | 'priority';

export type TaskArgFetch = {
    goalId: number;
    componentId: number | typeof ALL_TASKS_LIST_ID;
    page: number;
    showCompleted: 0 | 1;
    firstNew: 0 | 1;
    sortBy?: TaskSortBy;
    searchText?: string;
    filters?: TaskFilters;
    unlimited?: boolean;
    ignoreCompleted?: boolean;
    /** Only tasks whose dates overlap this period, inclusive ('YYYY-MM-DD'); tasks without dates are left out */
    dateFrom?: string;
    dateTo?: string;
    /** Only tasks with neither a start nor an end date */
    undated?: boolean;
    /** Keyset paging: the tasks after this one in the requested order, instead of `page` */
    afterId?: number;
    /** The priority of the `afterId` task, needed when sorting by priority */
    afterPriority?: 1 | 2 | 3 | null;
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

export type TaskArgMoveToProject = {
    taskId: number;
    targetGoalId: number;
};

// 'move' keeps the task id and removes it from the source project; 'copy' happens when the user may not delete
// tasks in the source project: the original stays and a new task is created in the target project
export type TaskMoveMode = 'move' | 'copy';

export type TaskMoveBlockReason = 'not_found' | 'same_project' | 'other_organization' | 'is_subtask' | 'no_target_permission';

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

export type TaskResponseMovePreview = {
    allowed: boolean;
    reason: TaskMoveBlockReason | null;
    mode: TaskMoveMode | null;
    tasks: number;
    timeEntries: number;
    removals: TaskMoveRemovals | null;
    leftBehind: TaskMoveLeftBehind | null;
};

export type TaskResponseMoveToProject = {
    mode: TaskMoveMode;
    taskId: number;
    goalId: number;
};
