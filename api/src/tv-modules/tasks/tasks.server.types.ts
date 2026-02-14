import { type } from 'arktype';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { GoalPermissions } from '../../types/auth.types';

export const TaskArkTypeFetchTaskByIdNew = type({
    taskId: type('string|number').pipe((v) => Number(v)),
});

export const TaskArkTypeUpdate = type({
    id: 'number',
    // 'goalId?': 'number',
    'parentId?': 'number|null',
    'description?': 'string',
    'complete?': 'boolean',
    'goalListId?': 'number|null',
    // 'creatorId?': 'number',
    'note?': 'string',
    'priorityId?': '1|2|3|null',
    'startDate?': 'string|null',
    'endDate?': 'string|null',
    'startTime?': 'string|null',
    'endTime?': 'string|null',
    'statusId?': 'number|null',
    'taskOrder?': 'number',
    'kanbanOrder?': 'number',
    'amount?': 'string|null',
    'transactionType?': '1|0|null',
    'nodeGraphPosition?': 'object|null',
});

export const TaskArkTypeNumberFromString = type('string | number').pipe((v) => Number(v));

export const TaskArkTypeZeroOneToNumber = type("'0' | '1' | 0 | 1").pipe((v) => Number(v));

export const TaskArkTypePriorityToNumber = type("'1' | '2' | '3' | 1 | 2 | 3").pipe((v) => Number(v));

export const TaskArkTypeSelectedTagsToNumber = type('object | string').pipe((v) =>
    typeof v === 'string' ? JSON.parse(v) : v
);

export const TaskArkTypeFetchTasksNewFilters = type({
    'selectedUser?': TaskArkTypeNumberFromString,
    'priority?': TaskArkTypePriorityToNumber,
    'selectedTags?': TaskArkTypeSelectedTagsToNumber,
});

export const TaskArkTypeFetchTasksNew = type({
    goalId: TaskArkTypeNumberFromString,
    componentId: TaskArkTypeNumberFromString,
    page: TaskArkTypeNumberFromString,
    showCompleted: TaskArkTypeZeroOneToNumber,
    firstNew: TaskArkTypeZeroOneToNumber,
    'searchText?': 'string',
    'filters?': type('object | string')
        .pipe((v) => {
            if (typeof v === 'string') {
                try {
                    return JSON.parse(v);
                } catch {
                    throw new Error('Invalid JSON for filters');
                }
            }
            return v;
        })
        .pipe(TaskArkTypeFetchTasksNewFilters),
    'unlimited?': type('string').pipe((v) => v === 'true'),
    'ignoreCompleted?': type('string').pipe((v) => v === 'true'),
});

export type TaskArgFetchTasksNew = typeof TaskArkTypeFetchTasksNew.infer;

export type TaskArgUpdate = typeof TaskArkTypeUpdate.infer;

/**
 * We can add task only with these fields
 * Other fields like (tags, assignedUsers)
 * are managed by other modules
 */
export const TaskArkTypeAdd = type({
    goalId: 'number',
    parentId: type('number | null').optional(),
    description: 'string',
    complete: type('boolean | null').optional(),
    goalListId: type('string | number | null')
        .pipe((v) => (v === null ? null : Number(v)))
        .optional(),
    note: type('string | null').optional(),
    priorityId: type('1 | 2 | 3 | null').optional(),
    startDate: type('string | null').optional(),
    endDate: type('string | null').optional(),
    startTime: type('string | null').optional(),
    endTime: type('string | null').optional(),
    statusId: type('number | null').optional(),
    taskOrder: type('number | null').optional(),
    kanbanOrder: type('number | null').optional(),
    amount: type('number | null').optional(),
    transactionType: type('0 | 1 | null').optional(),
    nodeGraphPosition: type('object | null').optional(),
});

export type TaskArgAdd = typeof TaskArkTypeAdd.infer;

export const TaskFieldPermissionsForEditOrCreation = {
    description: GoalPermissions.TASKS_CAN_EDIT_DESCRIPTION,
    note: GoalPermissions.TASKS_CAN_EDIT_NOTE,
    goalListId: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    priorityId: GoalPermissions.TASKS_CAN_EDIT_PRIORITY,
    complete: GoalPermissions.TASKS_CAN_EDIT_STATUS,
    startDate: GoalPermissions.TASKS_CAN_EDIT_DEADLINE,
    endDate: GoalPermissions.TASKS_CAN_EDIT_DEADLINE,
    startTime: GoalPermissions.TASKS_CAN_EDIT_DEADLINE,
    endTime: GoalPermissions.TASKS_CAN_EDIT_DEADLINE,

    
    parentId: GoalPermissions.TASKS_CAN_ADD_SUBTASKS, 
    statusId: GoalPermissions.TASKS_CAN_DELETE, 
    taskOrder: GoalPermissions.TASKS_CAN_DELETE,
    kanbanOrder: GoalPermissions.TASKS_CAN_DELETE,
    amount: GoalPermissions.TASKS_CAN_DELETE,
    transactionType: GoalPermissions.TASKS_CAN_DELETE, 
    nodeGraphPosition: GoalPermissions.TASKS_CAN_DELETE,
};

export const TaskFieldPermissionsForWatching = {
    description: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    note: GoalPermissions.TASK_CAN_WATCH_NOTE,

    goalListId: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    priorityId: GoalPermissions.TASKS_CAN_WATCH_PRIORITY,
    complete: GoalPermissions.TASKS_CAN_EDIT_STATUS,
    startDate: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    endDate: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    startTime: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    endTime: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,

    
    parentId: GoalPermissions.TASKS_CAN_WATCH_SUBTASKS,
    statusId: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    taskOrder: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    kanbanOrder: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    amount: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    transactionType: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
    nodeGraphPosition: GoalPermissions.COMPONENT_CAN_WATCH_CONTENT,
};

export type TaskForClientNew = TasksSchemaTypeForSelect & {
    tags: number[];
    assignedUsers: number[];
    historyId: number | null;
    subtasks: TaskForClientNew[];
};

export const TaskArkTypeDelete = type({
    taskId: 'number',
});

export type TaskArgDelete = typeof TaskArkTypeDelete.infer;

export type TaskArgFetchTaskByIdNew = typeof TaskArkTypeFetchTaskByIdNew.infer;

export const TasksArkTypeToggleTaskUsers = type({
    taskId: 'number',
    userIds: 'number[]',
});

export type TasksArgToggleTaskUsers = typeof TasksArkTypeToggleTaskUsers.infer;

export const TaskArkTypeFetchTaskHistory = type({
    taskId: type('string|number').pipe((v) => Number(v)),
});

export type TaskArgFetchTaskHistory = typeof TaskArkTypeFetchTaskHistory.infer;

export const TaskArkTypeRestoreTaskHistory = type({
    historyId: type('string|number').pipe((v) => Number(v)),
    taskId: type('string|number').pipe((v) => Number(v)),
});

export type TaskArgRestoreTaskHistory = typeof TaskArkTypeRestoreTaskHistory.infer;
