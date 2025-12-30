import { type } from 'arktype';
import type { Request, Response } from 'express';
import { $logger } from '../../modules/logget';
import {
    AddTaskArgSchema,
    DeleteTaskArgScheme,
    FetchAssignedUsersArgSchema,
    FetchSubtasksArgSchema,
    // FetchTaskHistoryArgScheme,
    // type FetchTasksArg,
    FetchTasksArgSchema,
    MoveTaskArgSchema,
    // TaskRecoverHistoryStateArgScheme,
    TaskSchemaFetchTaskById,
    TaskSchemaUpdateAmount,
    TaskSchemaUpdateOrders,
    TaskSchemaUpdateTransactionType,
    TasksSchemaUpdateStatusId,
    UpdatePriorityArgSchema,
    UpdateTaskAssigneeArgScheme,
    UpdateTaskCheckedArgSchems,
    UpdateTaskDeadlineArgScheme,
    UpdateTaskDescriptionArgScheme,
    UpdateTaskNoteArgScheme,
} from '../../types/tasks.types';
// import { Database } from "../../modules/db";
// import { SchemaTvTasks } from "../../modules/schemas/tasks.schema";
// import { logError } from "../../utils/api";
// import { TasksArkType, TasksSchema } from "taskview-db-schemas";
import {
    TaskArkTypeAdd,
    TaskArkTypeDelete,
    TaskArkTypeFetchTaskByIdNew,
    TaskArkTypeFetchTaskHistory,
    TaskArkTypeFetchTasksNew,
    TaskArkTypeRestoreTaskHistory,
    TaskArkTypeUpdate,
    TasksArkTypeToggleTaskUsers,
} from './tasks.server.types';
// import { TasksSchemaArkTypeInsert } from "taskview-db-schemas";

export class TasksController {
    /** @deprecated */
    fetchTaskById = async (req: Request, res: Response) => {
        const data = TaskSchemaFetchTaskById.safeParse(req.query);

        if (!data.success) {
            return res.status(400).end();
        }

        return res.tvJson({ task: await req.appUser.tasksManager.fetchTaskById(data.data) });
    };

    /** @deprecated */
    updateTaskOrders = async (req: Request, res: Response) => {
        const data = TaskSchemaUpdateOrders.safeParse(req.body);

        if (!data.success) {
            return res.status(400).end();
        }

        return res.tvJson({ update: await req.appUser.tasksManager.updateOrdersForTask(data.data) });
    };

    /** @deprecated */
    fetchAllTasks = async (req: Request, res: Response) => {
        const data = FetchTasksArgSchema.safeParse(req.query);

        if (!data.success) {
            return res.status(400).end();
        }

        const tasks = await req.appUser.tasksManager.fetchAllTasks(data.data);
        return res.tvJson(tasks);
    };

    /** @deprecated */
    fetchTasksForList = async (req: Request, res: Response) => {
        const data = FetchTasksArgSchema.safeParse(req.query);

        if (!data.success) {
            return res.status(400).end();
        }

        const tasks = await req.appUser.tasksManager.fetchTasks(data.data);
        return res.tvJson(tasks);
    };

    /** @deprecated use addTaskNew instead */
    addTask = async (req: Request, res: Response) => {
        const args = AddTaskArgSchema.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const task = await req.appUser.tasksManager.addTask(args.data);
        if (!task) {
            $logger.error(args.data, `Can not add task`);
            return res.status(500).end();
        }
        return res.tvJson({
            add: true,
            task,
        });
    };

    /** @deprecated*/
    updateChecked = async (req: Request, res: Response) => {
        const args = UpdateTaskCheckedArgSchems.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const task = await req.appUser.tasksManager.updateChecked(args.data);

        if (!task) {
            $logger.error(args.data, `Can not update task complete property`);
            return res.status(500).end();
        }

        return res.tvJson({ task });
    };

    /** @deprecated use deleteTaskNew instead */
    deleteTask = async (req: Request, res: Response) => {
        const args = DeleteTaskArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const deleteTask = await req.appUser.tasksManager.deleteTask(args.data.taskId);

        return res.tvJson({ delete: deleteTask });
    };

    /** @deprecated */
    updateDescription = async (req: Request, res: Response) => {
        const args = UpdateTaskDescriptionArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const task = await req.appUser.tasksManager.updateDescription(args.data);
        return res.tvJson({ task });
    };

    /** @deprecated */
    updateNote = async (req: Request, res: Response) => {
        const args = UpdateTaskNoteArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({
            update: await req.appUser.tasksManager.updateTaskNote(args.data),
        });
    };

    /** @deprecated */
    updateDeadline = async (req: Request, res: Response) => {
        const args = UpdateTaskDeadlineArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const taskDates = await req.appUser.tasksManager.updateDeadline(args.data);

        if (!taskDates) {
            return res.status(500).end();
        }

        return res.tvJson(taskDates);
    };

    /** @deprecated */
    fetchSubtasks = async (req: Request, res: Response) => {
        const args = FetchSubtasksArgSchema.safeParse(req.query);

        if (!args.success) {
            return res.status(400).end();
        }

        const subtasks = await req.appUser.tasksManager.fetchSubtasks(args.data);

        return res.tvJson(subtasks);
    };

    /** @deprecated */
    updatePriority = async (req: Request, res: Response) => {
        const args = UpdatePriorityArgSchema.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({
            update: await req.appUser.tasksManager.updatePriority(args.data),
        });
    };

    /**
     * Need to develop full logic for moving task (what to do with: assigned users, tags and others)
     * @deprecated
     * @param req
     * @param res
     * @returns
     */
    moveTask = async (req: Request, res: Response) => {
        const args = MoveTaskArgSchema.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({
            move: await req.appUser.tasksManager.moveTask(args.data),
        });
    };

    /** @deprecated */
    fetchAssignedUsers = async (req: Request, res: Response) => {
        const args = FetchAssignedUsersArgSchema.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({ usersIds: await req.appUser.tasksManager.fetchAssignedUsers(args.data) });
    };

    fetchTaskHistory = async (req: Request, res: Response) => {
        const data = TaskArkTypeFetchTaskHistory(req.params);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson({ history: await req.appUser.tasksManager.fetchTaskHistory(data) });
    };

    recoverTaskHistory = async (req: Request, res: Response) => {
        const args = TaskArkTypeRestoreTaskHistory(req.params);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        return res.tvJson({ recovery: !!(await req.appUser.tasksManager.recoverTaskHistory(args)) });
    };

    /** @deprecated */
    updateTaskAssignee = async (req: Request, res: Response) => {
        const args = UpdateTaskAssigneeArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const updateResult = await req.appUser.tasksManager.updateTaskAssignee(args.data);

        if (!updateResult) {
            return res.status(400).end();
        }

        return res.tvJson({
            usersIds: updateResult,
        });
    };

    toggleUserRolesNew = async (req: Request, res: Response) => {
        const args = TasksArkTypeToggleTaskUsers(req.body);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        return res.tvJson({ userIds: await req.appUser.tasksManager.toggleTaskUsers(args) });
    };

    /** @deprecated */
    updateTaskStatus = async (req: Request, res: Response) => {
        const args = TasksSchemaUpdateStatusId.safeParse(req.body);
        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({
            update: await req.appUser.tasksManager.updateTaskStatusId(args.data),
        });
    };

    /** @deprecated */
    updateAmount = async (req: Request, res: Response) => {
        const args = TaskSchemaUpdateAmount.safeParse(req.body);
        if (!args.success) {
            return res.status(400).end();
        }

        const updateResult = await req.appUser.tasksManager.updateAmount(args.data);
        return res.tvJson({
            update: updateResult ? args.data.amount : false,
        });
    };

    /** @deprecated */
    updateTransactionType = async (req: Request, res: Response) => {
        const args = TaskSchemaUpdateTransactionType.safeParse(req.body);
        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({
            update: await req.appUser.tasksManager.updateTransactionType(args.data),
        });
    };

    /** @deprecated */
    createTaskHandler = async (_req: Request, _res: Response) => {
        // const args = TasksArkType.safeParse(req.body);
        // if (!args.success) {
        //     return res.status(400).end();
        // }
    };

    /** @deprecated */
    updateTaskHandler = async (_req: Request, _res: Response) => {
        // const args = TasksArkType.safeParse(req.body);
        // if (!args.success) {
        //     return res.status(400).end();
        // }
    };

    updateTask = async (req: Request, res: Response) => {
        const args = TaskArkTypeUpdate(req.body);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        const task = await req.appUser.tasksManager.updateTask(args);

        return res.tvJson(task);
    };

    fetchTasksNew = async (req: Request, res: Response) => {
        // debugger;
        const out = TaskArkTypeFetchTasksNew(req.query);

        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }

        return res.tvJson(await req.appUser.tasksManager.fetchTasksNew(out));
    };

    fetchTaskByIdNew = async (req: Request, res: Response) => {
        const args = TaskArkTypeFetchTaskByIdNew(req.params);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        return res.tvJson(await req.appUser.tasksManager.fetchTaskByIdNew(args));
    };

    addTaskNew = async (req: Request, res: Response) => {
        const args = TaskArkTypeAdd(req.body);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        const tasks = await req.appUser.tasksManager.addTaskNew(args);

        if (tasks.length === 0) {
            return res.status(500).send('Can not add task');
        }

        return res.tvJson(tasks[0] ?? null);
    };

    deleteTaskNew = async (req: Request, res: Response) => {
        const args = TaskArkTypeDelete(req.body);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        return res.tvJson({ delete: await req.appUser.tasksManager.deleteTaskNew(args) });
    };
}
