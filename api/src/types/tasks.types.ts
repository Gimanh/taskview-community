import { z } from 'zod';
import { StringToNumber } from './app.types';

export type TaskItemInDb = {
    id: number;
    parent_id: number;
    description: string;
    complete: boolean;
    goal_list_id: number;
    date_creation: string;
    owner: number;
    responsible_id: number;
    creator_id: number;
    date_complete: string;
    note: string;
    edit_date: string;
    priority_id: 1 | 2 | 3;
    start_date: string;
    end_date: string;
    goal_id: number;
    start_time: string;
    end_time: string;
    status_id: number | null;
    kanban_order: number | null;
    task_order: number | null;
    amount: number | null;
    transaction_type: 1 | 0 | null;
    node_graph_position: Record<string, unknown> | null;
    // history_id?: number | null;
};

const NumberTrueSchema = z
    .record(
        z.string(), // Object keys will be validated later
        z.literal(true) // Values must be the string "true"
    )
    .refine(
        (obj) => Object.keys(obj).every((key) => !isNaN(Number(key))), // Ensure all keys are numbers
        {
            message: 'All keys must be numbers',
        }
    );

export const TasksFiltersSchema = z.object({
    selectedUser: z.number().optional(),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    selectedTags: NumberTrueSchema.optional(),
});

const zeroOrOneSchema = z
    .string()
    .transform((val) => Number(val))
    .refine((val) => val === 0 || val === 1, {
        message: 'Value must be 0 or 1',
    });

export const FetchTasksArgSchema = z.object({
    goalId: StringToNumber.optional(),
    componentId: StringToNumber,
    page: StringToNumber,
    showCompleted: zeroOrOneSchema,
    firstNew: zeroOrOneSchema,
    searchText: z.string(),
    filters: z.string().transform((val, ctx) => {
        try {
            const parsed = JSON.parse(val);
            return TasksFiltersSchema.parse(parsed);
        } catch (_err) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid JSON format for filters',
            });
            return z.NEVER;
        }
    }),
});

export type FetchTasksArg = z.infer<typeof FetchTasksArgSchema>;

export type TagsForTasks = { tag_id: number; task_id: number }[];

//TODO: REFACTOR THIS allow use all fields for adding task
export const AddTaskArgSchema = z.object({
    goalId: StringToNumber.nullable().optional().default(null),
    description: z.string(),
    componentId: StringToNumber,
    parentId: StringToNumber.nullable().optional(),
    statusId: StringToNumber.nullable().optional(),
    kanbanOrder: StringToNumber.nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    priorityId: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .nullable()
        .optional(),
});

export type AddTaskArg = z.infer<typeof AddTaskArgSchema>;

export const UpdateTaskCheckedArgSchems = z.object({
    taskId: StringToNumber,
    complete: z.boolean(),
});

export type UpdateTaskCheckedArg = z.infer<typeof UpdateTaskCheckedArgSchems>;

export const DeleteTaskArgScheme = z.object({
    taskId: StringToNumber,
});

export type DeleteTaskArg = z.infer<typeof DeleteTaskArgScheme>;

export const UpdateTaskDescriptionArgScheme = z.object({
    description: z.string(),
    taskId: StringToNumber,
});

export type UpdateTaskDescriptionArg = z.infer<typeof UpdateTaskDescriptionArgScheme>;

export const UpdateTaskNoteArgScheme = z.object({
    taskId: StringToNumber,
    note: z.string(),
});

export type UpdateTaskNoteArg = z.infer<typeof UpdateTaskNoteArgScheme>;

export const UpdateTaskDeadlineArgScheme = z.object({
    taskId: StringToNumber,
    status: z.union([z.literal('end'), z.literal('start')]),
    data: z.object({
        date: z.string().nullable().optional(),
        time: z.string().nullable().optional(),
    }),
});

export type UpdateTaskDeadlineArg = z.infer<typeof UpdateTaskDeadlineArgScheme>;

export type TaskDatesFromDb = {
    startDate: string | null;
    endDate: string | null;
    endTime: string | null;
    startTime: string | null;
};

export const FetchSubtasksArgSchema = z.object({
    taskId: StringToNumber,
});

export type FetchSubtasksArg = z.infer<typeof FetchSubtasksArgSchema>;

export const UpdatePriorityArgSchema = z.object({
    taskId: StringToNumber,
    priorityId: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type UpdatePriorityArg = z.infer<typeof UpdatePriorityArgSchema>;

export const MoveTaskArgSchema = z.object({
    taskId: StringToNumber,
    listId: StringToNumber.nullable(),
});

export type MoveTaskArg = z.infer<typeof MoveTaskArgSchema>;

export const FetchAssignedUsersArgSchema = z.object({
    taskId: StringToNumber,
});

export type FetchAssignedUsersArg = z.infer<typeof FetchAssignedUsersArgSchema>;

export const FetchTaskHistoryArgScheme = z.object({
    taskId: StringToNumber,
});

/** @deprecated */
export type FetchTaskHistoryArg = z.infer<typeof FetchTaskHistoryArgScheme>;

export type TaskHistoryItemFromServer = { history_id: number | null; task: TaskItemInDb };

export type TaskHistoryItemFromDb = { id: number; task_id: number; deleted: 0 | 1; task: TaskItemInDb };

/** @deprecated */
export const TaskRecoverHistoryStateArgScheme = z.object({
    historyId: StringToNumber,
    taskId: StringToNumber,
});

/** @deprecated */
export type TaskRecoverHistoryStateArg = z.infer<typeof TaskRecoverHistoryStateArgScheme>;

export const UpdateTaskAssigneeArgScheme = z.object({
    taskId: StringToNumber,
    usersIds: StringToNumber.array(),
});

export type UpdateTaskAssigneeArg = z.infer<typeof UpdateTaskAssigneeArgScheme>;

export const ALL_TASKS_LIST_ID = -1401;

export const DEFAULT_ID = -1;

export const TasksSchemaUpdateStatusId = z.object({
    taskId: StringToNumber,
    statusId: StringToNumber.nullable(),
});

export type TasksUpdateStatusId = z.infer<typeof TasksSchemaUpdateStatusId>;

export const TaskSchemaUpdateOrders = z.object({
    taskId: StringToNumber,
    taskOrder: StringToNumber.optional().nullable(),
    kanbanOrder: StringToNumber.optional().nullable(),
});

export type TaskUpdateOrders = z.infer<typeof TaskSchemaUpdateOrders>;

export const TaskSchemaFetchTaskById = z.object({
    taskId: StringToNumber,
});

export type TaskFetchTaskById = z.infer<typeof TaskSchemaFetchTaskById>;

export const TaskSchemaUpdateAmount = z.object({
    taskId: z.number(),
    amount: z.number().nullable(),
});

export type TaskUpdateAmount = z.infer<typeof TaskSchemaUpdateAmount>;

export const TaskSchemaUpdateTransactionType = z.object({
    taskId: z.number(),
    transactionType: z.union([z.literal(0), z.literal(1), z.null()]),
});

export type TaskUpdateTransactionType = z.infer<typeof TaskSchemaUpdateTransactionType>;
