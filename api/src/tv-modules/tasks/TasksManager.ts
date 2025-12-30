import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { $logger } from '../../modules/logget';
import { GoalPermissions } from '../../types/auth.types';
import type {
    AddTaskArg,
    FetchAssignedUsersArg,
    // FetchSubtasksArg,
    // FetchTaskHistoryArg,
    FetchTasksArg,
    MoveTaskArg,
    TaskDatesFromDb,
    TaskFetchTaskById,
    // TaskRecoverHistoryStateArg,
    TasksUpdateStatusId,
    TaskUpdateAmount,
    TaskUpdateOrders,
    TaskUpdateTransactionType,
    UpdatePriorityArg,
    UpdateTaskAssigneeArg,
    UpdateTaskCheckedArg,
    UpdateTaskDeadlineArg,
    UpdateTaskDescriptionArg,
    UpdateTaskNoteArg,
} from '../../types/tasks.types';
import { TaskItemForClient } from './TaskItemForClient';
import { TasksRepository } from './TasksRepository';
import {
    type TaskArgAdd,
    type TaskArgDelete,
    type TaskArgFetchTaskByIdNew,
    type TaskArgFetchTaskHistory,
    type TaskArgFetchTasksNew,
    type TaskArgRestoreTaskHistory,
    type TaskArgUpdate,
    type TaskFieldPermissionsForEditOrCreation,
    TaskFieldPermissionsForWatching,
    type TaskForClientNew,
    type TasksArgToggleTaskUsers,
} from './tasks.server.types';
import type { KanbanArgFetchTasksForColumn } from '../kanban/types';

type TaskFieldPermissionKey = keyof typeof TaskFieldPermissionsForEditOrCreation & keyof TasksSchemaTypeForSelect;

export class TasksManager {
    public readonly repository: TasksRepository;
    private readonly user: AppUser;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new TasksRepository();
    }

    /** @deprecated */
    async fetchTaskById(data: TaskFetchTaskById): Promise<TaskItemForClient | null> {
        const task = await this.repository.fetchTaskById(data.taskId);
        if (!task) return null;
        const tags = await this.repository.fetchTagsForTasks([task.id]);

        let tagIds: number[] = [];
        if (tags) {
            tagIds = tags.map((t) => t.tag_id);
        }

        return new TaskItemForClient(task, tagIds) ?? null;
    }

    /** @deprecated */
    async updateOrdersForTask(orderData: TaskUpdateOrders): Promise<boolean> {
        return this.repository.updateOrdersForTask(orderData);
    }

    /** @deprecated */
    async fetchAllTasks(data: FetchTasksArg): Promise<TaskItemForClient[]> {
        const tasks = await this.repository.fetchAllTasks(data);

        if (!tasks) {
            return [];
        }

        const tagsMap: Record<number, number[]> = {};
        const ids = tasks.map((t) => t.id);
        
        const tags = await this.repository.fetchTagsForTasks(ids);

        if (tags) {
            tags.forEach((item) => {
                if (!tagsMap[item.task_id]) {
                    tagsMap[item.task_id] = [];
                }
                tagsMap[item.task_id].push(item.tag_id);
            });
        }

        const assigneesMap: Record<number, number[]> = {};

        (await this.repository.fetchTaskAssigneeForTasks(ids)).forEach((a) => {
            if (!assigneesMap[a.task_id]) {
                assigneesMap[a.task_id] = [];
            }
            assigneesMap[a.task_id].push(a.collab_user_id);
        });

        const tasksForClient = tasks.map((t) => new TaskItemForClient(t, tagsMap[t.id], null, assigneesMap[t.id]));

        return tasksForClient;
    }

    async fetchTasks(data: FetchTasksArg): Promise<TaskItemForClient[]> {
        const tasks = await this.repository.fetchTasks(data);

        if (!tasks) {
            return [];
        }

        const tagsMap: Record<number, number[]> = {};
        const ids = tasks.map((t) => t.id);
        
        const tags = await this.repository.fetchTagsForTasks(ids);

        if (tags) {
            tags.forEach((item) => {
                if (!tagsMap[item.task_id]) {
                    tagsMap[item.task_id] = [];
                }
                tagsMap[item.task_id].push(item.tag_id);
            });
        }

        const assigneesMap: Record<number, number[]> = {};

        (await this.repository.fetchTaskAssigneeForTasks(ids)).forEach((a) => {
            if (!assigneesMap[a.task_id]) {
                assigneesMap[a.task_id] = [];
            }
            assigneesMap[a.task_id].push(a.collab_user_id);
        });

        const tasksForClient = tasks.map((t) => new TaskItemForClient(t, tagsMap[t.id], null, assigneesMap[t.id]));

        return tasksForClient;
    }

    async addTask(arg: AddTaskArg): Promise<TaskItemForClient | false> {
        const task = await this.repository.addTask(arg, this.user.getUserData()?.id as number);

        if (!task) {
            return false;
        }

        return new TaskItemForClient(task);
    }

    async updateChecked(arg: UpdateTaskCheckedArg): Promise<TaskItemForClient | false> {
        const task = await this.repository.updateTaskComplete(arg.taskId, arg.complete);

        if (!task) return false;

        return new TaskItemForClient(task);
    }

    /** @deprecated use deleteTaskNew instead */
    async deleteTask(taskId: number): Promise<boolean> {
        return await this.repository.deleteTask(taskId);
    }

    async updateDescription(arg: UpdateTaskDescriptionArg) {
        const task = await this.repository.updateTaskDescription(arg.taskId, arg.description);

        if (!task) {
            return false;
        }

        return new TaskItemForClient(task);
    }

    async updateTaskNote(arg: UpdateTaskNoteArg): Promise<boolean> {
        return await this.repository.updateTaskNote(arg.taskId, arg.note);
    }

    async updateDeadline(data: UpdateTaskDeadlineArg): Promise<TaskDatesFromDb | false> {
        const result = await this.repository.updateTaskDate(data.taskId, data.data, data.status);
        if (!result) {
            $logger.error(data, `Can not update task dates`);
        }
        return await this.repository.getTaskDeadlineDates(data.taskId);
    }

    // /** @deprecated */
    // async fetchSubtasks(data: FetchSubtasksArg): Promise<TaskItemForClient[]> {
    //     const subtasks = await this.repository.fetchSubtasks(data.taskId);
    //     return subtasks.map((t) => new TaskItemForClient(t));
    // }

    async updatePriority(data: UpdatePriorityArg): Promise<boolean> {
        return await this.repository.updatePriority(data.taskId, data.priorityId);
    }

    async moveTask(data: MoveTaskArg): Promise<boolean> {
        if (data.listId !== null) {
            const listIds = await this.repository.fetchAllowedListIdsForTask(data.taskId);
            if (!listIds.includes(data.listId)) return false;
        }

        return await this.repository.moveTask(data.taskId, data.listId);
    }

    async fetchAssignedUsers(data: FetchAssignedUsersArg) {
        return await this.repository.fetchTaskAssignee(data.taskId);
    }

    async fetchTaskHistory(
        data: TaskArgFetchTaskHistory
    ): Promise<(TasksSchemaTypeForSelect & { historyId: number | null })[]> {
        const history = await this.repository.fetchTaskHistory(data.taskId);

        if (!history || history.length === 0) return [];

        const toCamel = (str: string) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

        const normalizeKeys = <T extends object>(obj: T): any =>
            Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [toCamel(k), v && typeof v === 'object' ? normalizeKeys(v) : v])
            );

        const normalizedHistory: (TasksSchemaTypeForSelect & { historyId: number | null })[] = history.map((item) => {
            return normalizeKeys({ ...item.task, history_id: item.history_id });
        });

        return normalizedHistory;
    }

    async recoverTaskHistory(data: TaskArgRestoreTaskHistory) {
        return await this.repository.recoveryTaskHistory(data.historyId, data.taskId);
    }

    async updateTaskAssignee(data: UpdateTaskAssigneeArg) {
        const result = await this.repository.updateTaskAssignee(data.taskId, data.usersIds);
        if (!result) {
            $logger.error('Can not update task assignee');
            return false;
        }
        return data.usersIds;
    }

    async updateTaskStatusId(data: TasksUpdateStatusId): Promise<boolean> {
        const result = await this.repository.updateTaskStatusId(data);
        if (!result) {
            $logger.error(`Can not update task statusId ${data}`);
        }
        return result;
    }

    async updateAmount(data: TaskUpdateAmount): Promise<boolean> {
        return await this.repository.updateAmount(data);
    }

    async updateTransactionType(data: TaskUpdateTransactionType): Promise<boolean> {
        return await this.repository.updateTransactionType(data);
    }

    async updateTask(data: TaskArgUpdate): Promise<TaskForClientNew | null> {
        const task = await this.repository.updateTask(data);
        if (!task) {
            return null;
        }
        const tasks = await this.extendTasksWithTagsAndAssignees([task]);
        return tasks[0] ?? null;
    }

    async fetchTasksNew(data: TaskArgFetchTasksNew) {
        const tasks = await this.repository.fetch(data);
        if (!tasks) return [];
        return await this.extendTasksWithTagsAndAssignees(tasks);
    }

    async fetchTaskByIdNew(data: TaskArgFetchTaskByIdNew) {
        const task = await this.repository.fetchTaskByIdNew(data.taskId);
        if (!task) return null;
        const extendedTask = await this.extendTasksWithTagsAndAssignees([task]);
        return extendedTask[0] ?? null;
    }

    private async cleanTaskFieldsRegardPermissions(task: TasksSchemaTypeForSelect): Promise<TasksSchemaTypeForSelect> {
        const permissions = await this.user.permissionsFetcher.getCheckerForGoal(task.goalId);
        (Object.keys(TaskFieldPermissionsForWatching) as TaskFieldPermissionKey[]).forEach((key) => {
            if (!permissions.hasPermissions(TaskFieldPermissionsForWatching[key])) {
                // Type-safe: we know key is a valid field from TaskFieldPermissions
                // and we're intentionally nullifying it for permission reasons
                const taskWithNullableFields = task as TasksSchemaTypeForSelect &
                    Partial<Record<TaskFieldPermissionKey, null>>;
                taskWithNullableFields[key] = null;
            }
        });
        return task;
    }

    /**
     * //TODO CHECK PERMISSIONS FOR ALL FIELDS OF TASK
     * Extend tasks with tags and assignees
     * @param tasks
     * @returns
     */
    async extendTasksWithTagsAndAssignees(
        tasks: TasksSchemaTypeForSelect[],
        justCreated: boolean = false
    ): Promise<TaskForClientNew[]> {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        if (justCreated) {
            // TODO check permissions for task field here
            return await Promise.all(
                tasks.map(async (t) => ({
                    ...(await this.cleanTaskFieldsRegardPermissions(t)),
                    tags: [],
                    assignedUsers: [],
                    historyId: null,
                    subtasks: [],
                }))
            );
        }

        const tagsMap = new Map<number, number[]>();
        const assigneesMap = new Map<number, number[]>();
        const ids = tasks.map((t) => t.id);

        const taskPermissions = await this.user.permissionsFetcher.getCheckerForGoal(tasks[0].goalId);

        const [tags, assignees] = await Promise.all([
            taskPermissions.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_TAGS)
                ? this.repository.fetchTagsForTasks(ids)
                : Promise.resolve([]),
            taskPermissions.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS)
                ? this.repository.fetchTaskAssigneeForTasks(ids)
                : Promise.resolve([]),
        ]);

        tags.forEach((item) => {
            if (!tagsMap.get(item.task_id)) {
                tagsMap.set(item.task_id, []);
            }
            tagsMap.get(item.task_id)?.push(item.tag_id);
        });

        assignees.forEach((a) => {
            if (!assigneesMap.get(a.task_id)) {
                assigneesMap.set(a.task_id, []);
            }
            assigneesMap.get(a.task_id)?.push(a.collab_user_id);
        });

        return await Promise.all(
            tasks.map(async (t) => ({
                ...(await this.cleanTaskFieldsRegardPermissions(t)),
                tags: tagsMap.get(t.id) || [],
                assignedUsers: assigneesMap.get(t.id) || [],
                historyId: null,
                //subtasks should be without subtasks, tags and assignees
                subtasks: await this.extendTasksWithTagsAndAssignees(
                    taskPermissions.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_SUBTASKS)
                        ? await this.repository.fetchSubtasks(t.id)
                        : await Promise.resolve([]),
                    true
                ),
            }))
        );
    }

    async addTaskNew(data: TaskArgAdd) {
        let newData = { ...data };

        if (data.kanbanOrder === null || data.kanbanOrder === undefined) {
            const minKanbanOrder = await this.repository.fetchTaskWithMinKanbanOrder(data.goalId, data.statusId ?? null);
            const GAP = 16384;
            newData.kanbanOrder = (minKanbanOrder ?? 0) - GAP;
        }

        const task = await this.repository.addTaskNew(newData);
        return await this.extendTasksWithTagsAndAssignees(task, true);
    }

    async deleteTaskNew(data: TaskArgDelete) {
        return await this.repository.deleteTaskNew(data);
    }

    async toggleTaskUsers(data: TasksArgToggleTaskUsers) {
        return await this.repository.toggleTaskUsers(data);
    }

    async fetchTasksForKanbanColumn(data: KanbanArgFetchTasksForColumn): Promise<{ tasks: TaskForClientNew[], nextCursor: string | number | null }> {
        const tasks = await this.repository.fetchTasksForKanbanColumn(data.goalId, data.columnId, data.cursor);
        if (!tasks || tasks.length === 0) return { tasks: [], nextCursor: null };
        return { tasks: await this.extendTasksWithTagsAndAssignees(tasks), nextCursor: tasks[tasks.length - 1].kanbanOrder };
    }
}
