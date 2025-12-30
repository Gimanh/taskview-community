import { GoalsSchema, TasksSchema, TasksStatusesSchema, type TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import type { GoalItemInDb } from '../../types/goal.type';
import { logError } from '../../utils/api';
import { updateQuery } from '../../utils/db-helper';
import type { KanbanStatusItemInDb } from './types';
import { callWithCatch } from '../../utils/helpers';
import { and, asc, eq, gt, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import type { TaskItemInDb } from '../../types/tasks.types';
import { PgDialect } from 'drizzle-orm/pg-core';

export class KanbanRepository {
    private readonly db: Database;
    constructor() {
        this.db = Database.getInstance();
    }

    async getAllStatusesForGoal(goalId: GoalItemInDb['id']): Promise<KanbanStatusItemInDb[]> {
        if (!goalId) {
            return [];
        }

        const columns = await this.db
            .query<KanbanStatusItemInDb>('select * from tasks.statuses where goal_id = $1 order by id', [goalId])
            .catch(logError);

        if (!columns) return [];

        return columns.rows;
    }

    async updateNameFotStatus(
        id: KanbanStatusItemInDb['id'],
        name: KanbanStatusItemInDb['name'],
        viewOrder?: KanbanStatusItemInDb['view_order']
    ): Promise<boolean> {
        const isNumber = (value?: string | number) =>
            value !== undefined && value !== null && Number.isFinite(Number(value));

        const data = viewOrder
            ? { name, view_order: isNumber(viewOrder) && viewOrder ? +viewOrder : undefined }
            : { name };

        const queryData = updateQuery({
            table: 'tasks.statuses',
            data,
            where: { id },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async deleteStatus(id: KanbanStatusItemInDb['id']): Promise<boolean> {
        const del = await this.db.query('delete from tasks.statuses where id = $1', [id]).catch(logError);
        if (!del) return false;
        return del.rowCount !== null;
    }

    async fetchStatus(id: KanbanStatusItemInDb['id']): Promise<KanbanStatusItemInDb | null> {
        const statusResult = await this.db
            .query<KanbanStatusItemInDb>('select * from tasks.statuses where id = $1;', [id])
            .catch(logError);
        if (!statusResult || statusResult.rows.length === 0) return null;
        return statusResult.rows[0];
    }

    async addStatus(
        name: KanbanStatusItemInDb['name'],
        goalId: GoalItemInDb['id']
    ): Promise<KanbanStatusItemInDb | null> {
        const addResult = await this.db
            .query<{ id: number }>('insert into tasks.statuses (name, goal_id) values ($1, $2) returning id;', [
                name,
                goalId,
            ])
            .catch(logError);
        if (!addResult) return null;
        return await this.fetchStatus(addResult.rows[0].id);
    }

    async getTasksOrderForColumnAndCursor(goalId: GoalItemInDb['id'], columnId: KanbanStatusItemInDb['id'] | null, cursor: number | null): Promise<({ id: number, kanbanOrder: number | null }[]) | null> {
        const conditions = [
            columnId === null ? isNull(TasksSchema.statusId) : eq(TasksSchema.statusId, columnId),
            eq(TasksSchema.goalId, goalId),
            ...(cursor !== null ? [lte(TasksSchema.kanbanOrder, cursor)] : []),
        ];
        const result = await callWithCatch(() => this.db.dbDrizzle.select({
            kanbanOrder: TasksSchema.kanbanOrder, id: TasksSchema.id
        }).from(TasksSchema).where(and(...conditions)).orderBy(asc(TasksSchema.kanbanOrder)));
        return result ?? null;
    }

    async getNextTaskByKanbanOrder(data: {
        goalId: GoalItemInDb['id'],
        columnId: TasksSchemaTypeForSelect['statusId'],
        kanbanOrder: TasksSchemaTypeForSelect['kanbanOrder']
    }): Promise<TasksSchemaTypeForSelect | null> {
        const conditions = [
            eq(TasksSchema.goalId, data.goalId),
            data.columnId === null ? isNull(TasksSchema.statusId) : eq(TasksSchema.statusId, data.columnId),
            ...(data.kanbanOrder !== null ? [gt(TasksSchema.kanbanOrder, data.kanbanOrder)] : []),
        ];

        const result = await callWithCatch(() => this.db.dbDrizzle.select().from(TasksSchema)
            .where(and(
                ...conditions
            )).orderBy(asc(TasksSchema.kanbanOrder)).limit(1));

        return result?.[0] ?? null;
    }

    async getPreviousTaskByKanbanOrder(data: {
        goalId: GoalItemInDb['id'],
        columnId: TasksSchemaTypeForSelect['statusId'],
        kanbanOrder: TasksSchemaTypeForSelect['kanbanOrder']
    }): Promise<TasksSchemaTypeForSelect | null> {
        const conditions = [
            eq(TasksSchema.goalId, data.goalId),
            data.columnId === null ? isNull(TasksSchema.statusId) : eq(TasksSchema.statusId, data.columnId),
            ...(data.kanbanOrder !== null ? [lt(TasksSchema.kanbanOrder, data.kanbanOrder)] : []),
        ];

        const result = await callWithCatch(() => this.db.dbDrizzle.select().from(TasksSchema)
            .where(and(
                ...conditions
            )).orderBy(asc(TasksSchema.kanbanOrder)).limit(1));

        return result?.[0] ?? null;
    }

    async getTaskById(id: TaskItemInDb['id']): Promise<TasksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() => this.db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, id)));
        if (!result) {
            return null;
        }
        return result[0];
    }

    async updateTasksOrder(data: { id: number, kanbanOrder: number | null }[]): Promise<boolean> {
        if (!data || data.length === 0) {
            return false;
        }

        if (!data || data.length === 0) {
            return false;
        }

        const filtered = data.filter((d) => typeof d.id === 'number');

        if (filtered.length === 0) {
            return false;
        }

        try {
            const query = sql`
              UPDATE ${TasksSchema}
              SET kanban_order = CASE id
                ${sql.join(
                filtered.map(d =>
                    d.kanbanOrder === null
                        ? sql`WHEN ${d.id} THEN NULL`
                        : sql`WHEN ${d.id} THEN ${d.kanbanOrder}::double precision`
                ),
                sql` `
            )}
                ELSE kanban_order
              END
              WHERE id IN (${sql.join(filtered.map(d => d.id), sql`, `)})
            `;

            // const pgDialect = new PgDialect();
            // const compiledQuery = pgDialect.sqlToQuery(query);

            // console.log('SQL:', compiledQuery.sql);
            // console.log('Params:', compiledQuery.params);

            await this.db.dbDrizzle.execute(query);

            return true;
        } catch (error) {
            logError(error);
            return false;
        }
    }

    async updateColumnVersion(goalId: GoalItemInDb['id'], columnId: KanbanStatusItemInDb['id'] | null): Promise<boolean> {
        if (columnId === null) {
            const result = callWithCatch(() => this.db.dbDrizzle.update(GoalsSchema)
                .set({ backlogVersion: sql`${GoalsSchema.backlogVersion} + 1`, })
                .where(eq(GoalsSchema.id, goalId)));
            return result !== null;
        }

        const result = callWithCatch(() => this.db.dbDrizzle.update(TasksStatusesSchema)
            .set({ columnVersion: sql`${TasksStatusesSchema.columnVersion} + 1`, })
            .where(eq(TasksStatusesSchema.id, columnId)));

        return result !== null;
    }

    async getColumnVersion(goalId: GoalItemInDb['id'], columnId: KanbanStatusItemInDb['id'] | null): Promise<number | null> {
        if (columnId === null) {
            const result = await callWithCatch(() => this.db.dbDrizzle.select({ backlogVersion: GoalsSchema.backlogVersion })
                .from(GoalsSchema)
                .where(eq(GoalsSchema.id, goalId)));
            return result?.[0]?.backlogVersion ?? null;
        }

        const result = await callWithCatch(() => this.db.dbDrizzle.select({ columnVersion: TasksStatusesSchema.columnVersion })
            .from(TasksStatusesSchema)
            .where(eq(TasksStatusesSchema.id, columnId)));

        return result?.[0]?.columnVersion ?? null;
    }
}
