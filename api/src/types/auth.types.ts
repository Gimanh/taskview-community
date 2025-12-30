import { z } from 'zod';
import type { GoalPermissionsFetcher } from '../core/GoalPermissionsFetcher';

export type UserDbRecord = {
    id: number;
    login: string;
    email: string;
    password: string;
    block: 1 | 0;
    confirm_email_code: string | null;
    remind_password_code: string | null;
    remind_password_time: number | null;
    remember_token: string | null;
};

export const UserJwtPayloadSchema = z.object({
    id: z.number(),
    userData: z.object({
        id: z.number(),
        login: z.string(),
        email: z.string(),
    }),
});

export const RegisterUserInDbSchema = z.object({
    login: z.string(),
    email: z.string().email(),
    password: z.string(),
    confirmEmailCode: z.string(),
    block: z.number().min(0).max(1),
});

export type UserJwtPayload = z.infer<typeof UserJwtPayloadSchema>; //{ id: number; userData: Pick<UserDbRecord, 'id' | 'login' | 'email'> };

export type RegisterUserInDb = z.infer<typeof RegisterUserInDbSchema>;

export type TokensFromDb = {
    id: number;
    user_id: number;
    access_token: string;
    refresh_token: string;
    user_ip: string;
    time_creation: string;
};

export const ConfirmEmailReqDataSchema = z.object({
    login: z.string(),
    code: z.string(),
});

export type ConfirmEmailReqData = z.infer<typeof ConfirmEmailReqDataSchema>;

export const RemindPasswordSchema = z.object({
    email: z.string(),
});

export type RemindPassword = z.infer<typeof RemindPasswordSchema>;

export const ChangePasswordDataScheme = z
    .object({
        login: z.string(),
        code: z.string(),
        password: z.string(),
        passwordRepeat: z.string(),
    })
    .refine((data) => data.password === data.passwordRepeat, {
        message: "Passwords don't match",
        path: ['passwordRepeat'],
    });

export type ChangePasswordData = z.infer<typeof ChangePasswordDataScheme>;

export const RefreshTokenSchema = z.object({
    refreshToken: z.string(),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

export type GoalPermissionType = (typeof GoalPermissions)[keyof typeof GoalPermissions];
export type GoalPermissionsForClient = { [key in GoalPermissionType]?: true };
type PemrissionId = number;

// export type GoalPermissionItemsFromDb = Record<GoalPermissionType, PemrissionId>[];
export type GoalPermissionItemsFromDb = { permissionName: GoalPermissionType; permissionId: PemrissionId }[];

export const GoalPermissions = {
    ACCESS_CREATE_GOALS: 'access_create_goals',
    ACCESS_EDIT_GOALS: 'access_edit_goals',
    ACCESS_DELETE_GOALS: 'access_delete_goals',
    ACCESS_CREATE_COMPONENTS: 'access_create_components',
    ACCESS_EDIT_COMPONENTS: 'access_edit_components',
    ACCESS_DELETE_COMPONENTS: 'access_delete_components',
    ACCESS_CREATE_TASKS: 'access_create_tasks',
    ACCESS_EDIT_TASKS: 'access_edit_tasks',
    ACCESS_DELETE_TASKS: 'access_delete_tasks',

    GOAL_CAN_DELETE: 'goal_can_delete',
    GOAL_CAN_EDIT: 'goal_can_edit',
    GOAL_CAN_MANAGE_USERS: 'goal_can_manage_users',
    GOAL_CAN_WATCH_CONTENT: 'goal_can_watch_content',
    GOAL_CAN_ADD_TASK_LIST: 'goal_can_add_task_list',

    KANBAN_CAN_MANAGE: 'kanban_can_manage',
    KANBAN_CAN_VIEW: 'kanban_can_view',

    GRAPH_CAN_MANAGE: 'graph_can_manage',
    GRAPH_CAN_VIEW: 'graph_can_view',

    COMPONENT_CAN_DELETE: 'component_can_delete',
    COMPONENT_CAN_EDIT: 'component_can_edit',
    COMPONENT_CAN_WATCH_CONTENT: 'component_can_watch_content',
    COMPONENT_CAN_ADD_TASKS: 'component_can_add_tasks',

    COMPONENT_CAN_EDIT_ALL_TASKS: 'component_can_edit_all_tasks',
    COMPONENT_CAN_EDIT_THEIR_TASKS: 'component_can_edit_their_tasks',

    TASKS_CAN_DELETE: 'task_can_delete',
    TASKS_CAN_EDIT_DESCRIPTION: 'task_can_edit_description',
    TASKS_CAN_EDIT_STATUS: 'task_can_edit_status',
    TASKS_CAN_EDIT_NOTE: 'task_can_edit_note',
    TASK_CAN_WATCH_NOTE: 'task_can_watch_note',
    TASKS_CAN_EDIT_DEADLINE: 'task_can_edit_deadline',
    TASKS_CAN_WATCH_DETAILS: 'task_can_watch_details',
    TASKS_CAN_WATCH_SUBTASKS: 'task_can_watch_subtasks',
    TASKS_CAN_ADD_SUBTASKS: 'task_can_add_subtasks',
    TASKS_CAN_EDIT_TAGS: 'task_can_edit_tags',
    TASKS_CAN_WATCH_TAGS: 'task_can_watch_tags',
    TASKS_CAN_WATCH_PRIORITY: 'task_can_watch_priority',
    TASKS_CAN_EDIT_PRIORITY: 'task_can_edit_priority',
    TASKS_CAN_ACCESS_HISTORY: 'task_can_access_history',
    TASKS_CAN_RECOVERY_HISTORY: 'task_can_recovery_history',
    TASKS_CAN_ASSIGN_USERS: 'task_can_assign_users',
    TASKS_CAN_WATCH_ASSIGNED_USERS: 'task_can_watch_assigned_users',
} as const;

export type PermissionsEntityType =
    | typeof GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
    | typeof GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASKLIST
    | typeof GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK;
