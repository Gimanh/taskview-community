import { and, asc, desc, eq, exists, gt, ilike, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { TasksAssigneeSchema, TasksSchema, TasksToTagsSchema } from 'taskview-db-schemas';
import { FetchTasksQueryBuilder } from '../../core/FetchTasksQueryBuilder';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { GoalListInDb } from '../../types/goal-list.types';
import {
    type AddTaskArg,
    ALL_TASKS_LIST_ID,
    type FetchTasksArg,
    type TagsForTasks,
    type TaskDatesFromDb,
    type TaskHistoryItemFromDb,
    type TaskHistoryItemFromServer,
    type TaskItemInDb,
    type TasksUpdateStatusId,
    type TaskUpdateAmount,
    type TaskUpdateOrders,
    type TaskUpdateTransactionType,
    type UpdateTaskDeadlineArg,
} from '../../types/tasks.types';
import { logError } from '../../utils/api';
import { updateQuery } from '../../utils/db-helper';
import { callWithCatch, isNotNullable } from '../../utils/helpers';
import type {
    TaskArgAdd,
    TaskArgDelete,
    TaskArgFetchTasksNew,
    TaskArgUpdate,
    TasksArgToggleTaskUsers,
} from './tasks.server.types';

export class TasksRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async updateOrdersForTask(orderData: TaskUpdateOrders): Promise<boolean> {
        const data: Partial<Pick<TaskItemInDb, 'kanban_order' | 'task_order'>> = {};
        if (!isNotNullable(orderData['kanbanOrder']) && !isNotNullable(orderData['taskOrder'])) {
            return false;
        }

        if (isNotNullable(orderData['kanbanOrder'])) {
            data['kanban_order'] = orderData['kanbanOrder'];
        }
        if (isNotNullable(orderData['taskOrder'])) {
            data['task_order'] = orderData['taskOrder'];
        }

        const updateData = updateQuery({
            table: 'tasks.tasks',
            data,
            where: { id: orderData['taskId'] },
        });

        const updateResult = await this.db.query(updateData.query, updateData.args).catch(logError);

        if (!updateResult) return false;

        return !!(updateResult?.rowCount && updateResult.rowCount > 0);
    }

    /** @deprecated */
    async fetchAllTasks(data: FetchTasksArg): Promise<TaskItemInDb[] | false> {
        const builder = new FetchTasksQueryBuilder(data, true);
        const queryData = builder.getQuery();

        $logger.debug(queryData, 'FETCH TASKS');

        const tasks = await this.db.query<TaskItemInDb>(queryData.query, queryData.args).catch(logError);

        if (!tasks) {
            return false;
        }

        return tasks.rows;
    }

    async fetchTasks(data: FetchTasksArg): Promise<TaskItemInDb[] | false> {
        const builder = new FetchTasksQueryBuilder(data);
        const queryData = builder.getQuery();

        $logger.debug(queryData, 'FETCH TASKS');

        const tasks = await this.db.query<TaskItemInDb>(queryData.query, queryData.args).catch(logError);

        if (!tasks) {
            return false;
        }

        return tasks.rows;
    }

    /**
     * Deprecated try to use addTaskNew instead which is using drizzle
     * @param arg
     * @param creatorId
     * @returns
     */
    async addTask(arg: AddTaskArg, creatorId: number): Promise<TaskItemInDb | false> {
        const {
            parentId,
            description,
            componentId,
            goalId,
            statusId,
            kanbanOrder,
            startDate = null,
            endDate = null,
            priorityId = 1,
        } = arg;

        if (!goalId) {
            $logger.error(arg, `Can not insert task without goalId ${goalId}`);
            return false;
        }

        const query = parentId
            ? 'INSERT INTO tasks.tasks (description, goal_list_id, parent_id, creator_id, goal_id, start_date, end_date, priority_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;'
            : 'INSERT INTO tasks.tasks (description, goal_list_id, creator_id, goal_id, status_id, kanban_order, start_date, end_date, priority_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;';

        const componentIdValue = !componentId || componentId === ALL_TASKS_LIST_ID ? null : componentId;
        const args = parentId
            ? [description, componentIdValue, parentId, creatorId, goalId, startDate, endDate, priorityId]
            : [description, componentIdValue, creatorId, goalId, statusId, kanbanOrder, startDate, endDate, priorityId];

        const result = await this.db.query(query, args).catch(logError);

        if (!result) {
            return false;
        }

        if (result.rowCount === 0) {
            return false;
        }
        return await this.fetchTaskById(result.rows[0].id);
    }

    async fetchTaskById(taskId: number): Promise<TaskItemInDb | false> {
        const task = await this.db
            .query<TaskItemInDb>(
                'select *, start_date::text, end_date::text from tasks.tasks where id = $1 order by id desc',
                [taskId]
            )
            .catch(logError);

        if (!task) {
            return false;
        }

        if (task.rows.length === 0) {
            return false;
        }

        return task.rows[0];
    }

    async fetchTagsForTasks(taskIds: number[]): Promise<TagsForTasks> {
        if (taskIds.length === 0) {
            return [];
        }

        const placeholders = taskIds.map((_v, i) => `$${i + 1}`).join(',');
        const result = await this.db
            .query<TagsForTasks[number]>(
                `SELECT tag_id, task_id FROM tasks.tasks_to_tags WHERE task_id in (${placeholders})`,
                taskIds
            )
            .catch(logError);

        if (!result) {
            return [];
        }
        return result.rows;
    }

    async fetchTagsIdsForTask(taskId: number): Promise<number[]> {
        const query = 'SELECT tag_id FROM tasks.tasks_to_tags WHERE task_id = $1';
        const result = await this.db.query<{ tag_id: number }>(query, [taskId]).catch(logError);

        if (!result || result.rows.length === 0) {
            return [];
        }

        return result.rows.map((row) => row.tag_id);
    }

    async updateTaskDescription(taskId: number, description: string): Promise<TaskItemInDb | false> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: { description },
            where: { id: taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        if (!result) {
            return false;
        }

        return await this.fetchTaskById(taskId);
    }

    async updateTaskComplete(taskId: number, complete: boolean): Promise<TaskItemInDb | false> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: { complete: Number(complete) },
            where: { id: taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        if (!result) {
            return false;
        }

        return await this.fetchTaskById(taskId);
    }

    async deleteTask(taskId: number): Promise<boolean> {
        const result = await this.db.query('DELETE FROM tasks.tasks WHERE id = $1', [taskId]).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async updateTaskNote(taskId: number, note: string): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: { note },
            where: { id: taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async updateTaskDate(
        taskId: number,
        data: UpdateTaskDeadlineArg['data'],
        status: UpdateTaskDeadlineArg['status']
    ): Promise<boolean> {
        const columnNames =
            status === 'end' ? ['end_date = $1', 'end_time = $2'] : ['start_date = $1', 'start_time = $2'];

        const query = `UPDATE tasks.tasks SET ${columnNames.join(', ')} WHERE id = $3`;
        const result = await this.db.query(query, [data.date ?? null, data.time ?? null, taskId]).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async getTaskDeadlineDates(taskId: number): Promise<TaskDatesFromDb | false> {
        const result = await this.db
            .query<TaskDatesFromDb>(
                'SELECT start_date::text AS "startDate", end_date::text AS "endDate", end_time AS "endTime", start_time AS "startTime" FROM tasks.tasks WHERE id = $1',
                [taskId]
            )
            .catch(logError);

        if (!result || result.rows.length === 0) {
            return false;
        }

        return result.rows[0];
    }

    async fetchSubtasks(taskId: number): Promise<TasksSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.parentId, taskId))
        );

        return result ?? [];
    }

    async moveTask(taskId: number, goalListId: number | null): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: {
                goal_list_id: goalListId,
            },
            where: { id: taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async fetchAppPriorities(): Promise<any[]> {
        const result = await this.db
            .query<{ id: 1 | 2 | 3; code: 'low' | 'medium' | 'high' }>(
                `SELECT * 
             FROM tasks.priority 
             ORDER BY id`
            )
            .catch(logError);

        if (!result) {
            return [];
        }

        return result.rows;
    }

    async updatePriority(taskId: number, priorityId: number): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: { priority_id: priorityId },
            where: { id: taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async fetchTaskHistory(taskId: number): Promise<TaskHistoryItemFromServer[]> {
        const result = await this.db
            .query<TaskHistoryItemFromServer>(
                `SELECT id AS history_id, task 
             FROM history.tasks_tasks 
             WHERE task_id = $1 
             ORDER BY id DESC`,
                [taskId]
            )
            .catch(logError);

        if (result) {
            const actualTask = await this.db
                .query<TaskItemInDb>(`SELECT *, start_date::text, end_date::text FROM tasks.tasks WHERE id = $1`, [taskId])
                .catch(logError);
            if (actualTask) {
                result.rows.unshift({ history_id: null, task: actualTask.rows[0] });
            } else {
                $logger.error(`Can not fetch data for actual task`);
            }
        }

        return result?.rows || [];
    }

    async fetchTaskHistoryById(id: number): Promise<TaskHistoryItemFromDb | null> {
        const result = await this.db
            .query<TaskHistoryItemFromDb>(
                `SELECT * 
             FROM history.tasks_tasks 
             WHERE id = $1`,
                [id]
            )
            .catch(logError);

        if (!result || result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    async updateTaskState(taskData: TaskItemInDb): Promise<boolean> {
        const taskId = taskData.id;
        delete (taskData as Partial<TaskItemInDb>).id;
        delete (taskData as Partial<TaskItemInDb>).creator_id;
        delete (taskData as Partial<TaskItemInDb>).date_creation;
        delete (taskData as Partial<TaskItemInDb>).edit_date;

        const data = updateQuery({
            table: 'tasks.tasks',
            data: taskData,
            where: { id: taskId },
        });

        const result = await this.db.query(data.query, data.args).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async fetchListName(listId: number): Promise<any[]> {
        const query = 'SELECT name FROM tasks.goal_lists WHERE id = $1';
        const result = await this.db.query(query, [listId]).catch(logError);

        if (result && result.rows.length > 0) {
            return result.rows;
        }
        return [];
    }

    /**@deprecated try to use toggleTaskUsers instead */
    async updateTaskAssignee(taskId: number, userIds: number[]): Promise<boolean> {
        const deleteQuery = 'DELETE FROM tasks_auth.task_assignee WHERE task_id = $1';
        const deleteResult = await this.db.query(deleteQuery, [taskId]).catch(logError);

        if (!deleteResult) {
            $logger.error(`Can not update assignee for task ${taskId} users ${userIds}`);
        }

        if (userIds.length > 0) {
            let insertQuery = 'INSERT INTO tasks_auth.task_assignee (task_id, collab_user_id) VALUES ';
            const values: any = [];
            const args: any[] = [];

            userIds.forEach((userId, index) => {
                values.push(`($1, $${index + 2})`);
                args.push(userId);
            });

            insertQuery += values.join(',');
            const insertResult = await this.db.query(insertQuery, [taskId, ...args]).catch((err) => {
                logError(err);
            });

            return !!(insertResult?.rowCount && insertResult.rowCount > 0);
        }

        return true;
    }

    async toggleTaskUsers(data: TasksArgToggleTaskUsers): Promise<number[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.transaction(async (tx) => {
                await tx.delete(TasksAssigneeSchema).where(eq(TasksAssigneeSchema.taskId, data.taskId));

                if (data.userIds.length > 0) {
                    return await tx
                        .insert(TasksAssigneeSchema)
                        .values(data.userIds.map((userId) => ({ taskId: data.taskId, collabUserId: userId })))
                        .returning();
                }
                return [];
            })
        );

        return result?.map((rec) => rec.collabUserId) ?? [];
    }

    // Fetch task assignees for a given task
    async fetchTaskAssignee(taskId: number): Promise<number[]> {
        const query = 'SELECT collab_user_id FROM tasks_auth.task_assignee WHERE task_id = $1';
        const result = await this.db.query(query, [taskId]).catch(logError);

        if (result && result.rows.length > 0) {
            return result.rows.map((rec: any) => rec.collab_user_id);
        }

        return [];
    }

    async fetchTaskAssigneeForTasks(taskIds: number[]): Promise<{ task_id: number; collab_user_id: number }[]> {
        if (taskIds.length === 0) {
            return [];
        }

        const query = `SELECT task_id, collab_user_id FROM tasks_auth.task_assignee WHERE task_id in (${taskIds.map((_, i) => `$${i + 1}`).join(',')})`;
        const result = await this.db.query<{ task_id: number; collab_user_id: number }>(query, taskIds).catch(logError);

        if (result && result.rows.length > 0) {
            return result.rows;
        }

        return [];
    }

    async recoveryTaskHistory(historyId: number, _taskId: number): Promise<boolean> {
        const history = await this.fetchTaskHistoryById(historyId);

        if (!history) {
            return false;
        }

        return await this.updateTaskState(history.task);
    }

    async updateTaskStatusId(data: TasksUpdateStatusId): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: { status_id: data.statusId },
            where: { id: data.taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async fetchAllowedListIdsForTask(taskId: TaskItemInDb['id']): Promise<GoalListInDb['id'][]> {
        const task = await this.fetchTaskById(taskId);
        if (!task) return [];
        const query = 'select id from tasks.goal_lists where goal_id = $1;';
        const result = await this.db.query<{ id: number }>(query, [task.goal_id]);
        return result.rows.map((list) => list.id);
    }

    async updateAmount(data: TaskUpdateAmount): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: { amount: data.amount },
            where: { id: data.taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async updateTransactionType(data: TaskUpdateTransactionType): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.tasks',
            data: { transaction_type: data.transactionType },
            where: { id: data.taskId },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async updateTask(data: TaskArgUpdate): Promise<TasksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(TasksSchema).set(data).where(eq(TasksSchema.id, data.id)).returning()
        );
        return result?.[0] ?? null;
    }

    async fetchTaskByIdNew(taskId: number): Promise<TasksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, taskId))
        );
        return result?.[0] ?? null;
    }

    async fetch(data: TaskArgFetchTasksNew): Promise<TasksSchemaTypeForSelect[]> {
        const now = performance.now();

        const unlimited = data.unlimited ?? false;

        const conditions = [isNull(TasksSchema.parentId)];

        // goal / list
        if (+data.componentId !== ALL_TASKS_LIST_ID && +data.componentId !== -1) {
            conditions.push(eq(TasksSchema.goalListId, data.componentId));
        } else {
            conditions.push(eq(TasksSchema.goalId, data.goalId));
        }

        // priority
        if (data.filters?.priority !== undefined) {
            conditions.push(eq(TasksSchema.priorityId, data.filters.priority as 1 | 2 | 3));
        }

        // search
        if (data.searchText) {
            conditions.push(ilike(TasksSchema.description, `%${data.searchText}%`));
        }

        // complete
        if (data.showCompleted === 0) conditions.push(eq(TasksSchema.complete, false));
        else if (data.showCompleted === 1) conditions.push(eq(TasksSchema.complete, true));

        // assignee filter — через EXISTS
        if (data.filters?.selectedUser) {
            conditions.push(
                exists(
                    this.db.dbDrizzle
                        .select({ one: sql`1` })
                        .from(TasksAssigneeSchema)
                        .where(
                            and(
                                eq(TasksAssigneeSchema.taskId, TasksSchema.id),
                                eq(TasksAssigneeSchema.collabUserId, data.filters.selectedUser)
                            )
                        )
                )
            );
        }

        // tags filter — by EXISTS (any of the list)
        if (data.filters?.selectedTags) {
            const tagIds = Object.keys(data.filters.selectedTags).map(Number);
            if (tagIds.length > 0) {
                conditions.push(
                    exists(
                        this.db.dbDrizzle
                            .select({ one: sql`1` })
                            .from(TasksToTagsSchema)
                            .where(
                                and(
                                    eq(TasksToTagsSchema.taskId, TasksSchema.id),
                                    inArray(TasksToTagsSchema.tagId, tagIds)
                                )
                            )
                    )
                );
            }
        }

        const order = +data.firstNew === 1 ? desc(TasksSchema.id) : asc(TasksSchema.id);

        const limit = 30;
        const offset = (data.page ?? 0) * limit;

        let dbv;
        if (unlimited) {
            dbv = this.db.dbDrizzle
                .select()
                .from(TasksSchema)
                .where(and(...conditions))
                .orderBy(order);
        } else {
            dbv = this.db.dbDrizzle
                .select()
                .from(TasksSchema)
                .where(and(...conditions))
                .orderBy(order)
                .limit(limit)
                .offset(offset);
        }

        const rows = await dbv.execute();

        console.log('TaskArgFetchTasksNew time', performance.now() - now);
        return rows;
    }

    async addTaskNew(data: TaskArgAdd): Promise<TasksSchemaTypeForSelect[]> {
        const result = await callWithCatch(() => this.db.dbDrizzle.insert(TasksSchema).values(data).returning());
        if (!result) return [];
        return result;
    }

    async deleteTaskNew(data: TaskArgDelete): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(TasksSchema).where(eq(TasksSchema.id, data.taskId))
        );
        return !!result?.rowCount;
    }

    async fetchTasksForKanbanColumn(goalId: number, columnId: number | null, cursor: number | null): Promise<TasksSchemaTypeForSelect[]> {
        const conditions = [
            eq(TasksSchema.goalId, goalId),
            columnId === null ? isNull(TasksSchema.statusId) : eq(TasksSchema.statusId, columnId),
            isNotNull(TasksSchema.kanbanOrder),
        ];
        if (cursor !== null) {
            conditions.push(gt(TasksSchema.kanbanOrder, cursor));
        }

        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TasksSchema).where(and(...conditions)).orderBy(asc(TasksSchema.kanbanOrder)).limit(20)
        );
        return result ?? [];
    }

    async fetchTaskWithMinKanbanOrder(goalId: number, columnId: number | null): Promise<number | null> {
        const conditions = [
            eq(TasksSchema.goalId, goalId),
            columnId === null ? isNull(TasksSchema.statusId) : eq(TasksSchema.statusId, columnId),
        ];
        const result = await callWithCatch(() => this.db.dbDrizzle.select({
            minKanbanOrder: sql<number>`MIN(kanban_order)`
        }).from(TasksSchema).where(and(...conditions)));
        return result?.[0]?.minKanbanOrder ?? null;
    }
}
