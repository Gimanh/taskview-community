import { and, count, countDistinct, eq, inArray, isNotNull, isNull, min, not, or, type SQL } from 'drizzle-orm';
import {
    FileToTaskSchema,
    GoalsSchema,
    GraphRelationsSchema,
    IntegrationTaskMapSchema,
    RecurrenceRulesSchema,
    SprintTaskOutcomesSchema,
    TasksAssigneeSchema,
    TasksSchema,
    type TasksSchemaTypeForSelect,
    TasksToTagsSchema,
    TimeEntriesSchema,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { TasksRepository } from './TasksRepository';
import type {
    TaskCopyExecuteArgs,
    TaskCopyResult,
    TaskMoveContext,
    TaskMoveContextArgs,
    TaskMoveCountArgs,
    TaskMoveExecuteArgs,
    TaskMoveRemovals,
    TaskMoveTimeEntryCountArgs,
} from './task-move.types';

type Transaction = Parameters<Parameters<Database['dbDrizzle']['transaction']>[0]>[0];

export class TaskMoveRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async fetchContext(args: TaskMoveContextArgs): Promise<TaskMoveContext | null> {
        const [task] = await this.db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, args.taskId)).limit(1);
        if (!task) return null;

        const goals = await this.db.dbDrizzle
            .select({ id: GoalsSchema.id, organizationId: GoalsSchema.organizationId, ownerId: GoalsSchema.owner })
            .from(GoalsSchema)
            .where(inArray(GoalsSchema.id, [task.goalId, args.targetGoalId]));
        const source = goals.find((g) => g.id === task.goalId);
        const target = goals.find((g) => g.id === args.targetGoalId) ?? null;

        return { task, sourceOrganizationId: source?.organizationId ?? null, target };
    }

    // All descendants of a task, parents before children
    async fetchSubtaskIds(rootTaskId: number): Promise<number[]> {
        const result: number[] = [];
        let level = [rootTaskId];
        while (level.length > 0) {
            const children = await this.db.dbDrizzle
                .select({ id: TasksSchema.id })
                .from(TasksSchema)
                .where(inArray(TasksSchema.parentId, level));
            level = children.map((c) => c.id).filter((id) => !result.includes(id) && id !== rootTaskId);
            result.push(...level);
        }
        return result;
    }

    async countRemovals(args: TaskMoveCountArgs): Promise<TaskMoveRemovals> {
        const ids = args.taskIds;
        const total = async (query: Promise<{ value: number }[]>) => Number((await query)[0]?.value ?? 0);
        const db = this.db.dbDrizzle;

        const recurrenceTasks = new Set<number>();
        const instances = await db
            .select({ id: TasksSchema.id })
            .from(TasksSchema)
            .where(and(inArray(TasksSchema.id, ids), isNotNull(TasksSchema.recurrenceRuleId)));
        const templates = await db
            .select({ id: RecurrenceRulesSchema.templateTaskId })
            .from(RecurrenceRulesSchema)
            .where(inArray(RecurrenceRulesSchema.templateTaskId, ids));
        for (const row of [...instances, ...templates]) if (row.id !== null) recurrenceTasks.add(row.id);

        return {
            tags: await total(db.select({ value: count() }).from(TasksToTagsSchema).where(inArray(TasksToTagsSchema.taskId, ids))),
            assignees: await total(db.select({ value: count() }).from(TasksAssigneeSchema).where(inArray(TasksAssigneeSchema.taskId, ids))),
            fileLinks: await total(db.select({ value: count() }).from(FileToTaskSchema).where(inArray(FileToTaskSchema.taskId, ids))),
            dependencies: await total(db.select({ value: count() }).from(GraphRelationsSchema).where(this.crossingEdges(ids))),
            sprintOutcomes: await total(
                db.select({ value: count() }).from(SprintTaskOutcomesSchema).where(inArray(SprintTaskOutcomesSchema.taskId, ids))
            ),
            integrationLinks: await total(
                db.select({ value: count() }).from(IntegrationTaskMapSchema).where(inArray(IntegrationTaskMapSchema.taskId, ids))
            ),
            recurrence: recurrenceTasks.size,
        };
    }

    async countTimeEntries(args: TaskMoveTimeEntryCountArgs): Promise<number> {
        const conditions: SQL[] = [inArray(TimeEntriesSchema.taskId, args.taskIds)];
        if (args.userIds !== null) conditions.push(inArray(TimeEntriesSchema.userId, args.userIds.length ? args.userIds : [-1]));
        const [row] = await this.db.dbDrizzle
            .select({ value: countDistinct(TimeEntriesSchema.id) })
            .from(TimeEntriesSchema)
            .where(and(...conditions));
        return Number(row?.value ?? 0);
    }

    async executeMove(args: TaskMoveExecuteArgs): Promise<TasksSchemaTypeForSelect | null> {
        const { plan } = args;
        const ids = plan.taskIds;

        return this.db.dbDrizzle.transaction(async (tx) => {
            const [locked] = await tx.select({ id: TasksSchema.id }).from(TasksSchema).where(eq(TasksSchema.id, plan.rootTaskId)).for('update');
            if (!locked) return null;

            await tx.delete(TasksToTagsSchema).where(inArray(TasksToTagsSchema.taskId, ids));
            await tx.delete(TasksAssigneeSchema).where(inArray(TasksAssigneeSchema.taskId, ids));
            await tx.delete(FileToTaskSchema).where(inArray(FileToTaskSchema.taskId, ids));
            await tx.delete(SprintTaskOutcomesSchema).where(inArray(SprintTaskOutcomesSchema.taskId, ids));
            await tx.delete(IntegrationTaskMapSchema).where(inArray(IntegrationTaskMapSchema.taskId, ids));
            await tx.delete(GraphRelationsSchema).where(this.crossingEdges(ids));
            await tx.update(RecurrenceRulesSchema).set({ templateTaskId: null }).where(inArray(RecurrenceRulesSchema.templateTaskId, ids));

            if (plan.leftBehindSubtaskIds.length > 0) {
                await tx
                    .update(TasksSchema)
                    .set({ parentId: null })
                    .where(and(inArray(TasksSchema.id, plan.leftBehindSubtaskIds), inArray(TasksSchema.parentId, ids)));
            }

            const timeEntryConditions: SQL[] = [inArray(TimeEntriesSchema.taskId, ids)];
            if (plan.timeEntryUserIds !== null) {
                timeEntryConditions.push(inArray(TimeEntriesSchema.userId, plan.timeEntryUserIds.length ? plan.timeEntryUserIds : [-1]));
            }
            await tx.update(TimeEntriesSchema).set({ goalId: plan.targetGoalId }).where(and(...timeEntryConditions));

            let order = await this.nextBacklogOrder(tx, plan.targetGoalId);
            for (const id of ids) {
                await tx
                    .update(TasksSchema)
                    .set({
                        goalId: plan.targetGoalId,
                        owner: plan.targetGoalOwnerId,
                        goalListId: null,
                        statusId: null,
                        sprintId: null,
                        nodeGraphPosition: null,
                        recurrenceRuleId: null,
                        recurrenceInstanceDate: null,
                        kanbanOrder: order,
                    })
                    .where(eq(TasksSchema.id, id));
                order -= TasksRepository.KANBAN_ORDER_GAP;
            }

            await tx
                .update(GraphRelationsSchema)
                .set({ goalId: plan.targetGoalId })
                .where(and(inArray(GraphRelationsSchema.fromTaskId, ids), inArray(GraphRelationsSchema.toTaskId, ids)));

            const [root] = await tx.select().from(TasksSchema).where(eq(TasksSchema.id, plan.rootTaskId));
            return root ?? null;
        });
    }

    async executeCopy(args: TaskCopyExecuteArgs): Promise<TaskCopyResult> {
        const { plan } = args;

        return this.db.dbDrizzle.transaction(async (tx) => {
            const originals = await tx.select().from(TasksSchema).where(inArray(TasksSchema.id, plan.taskIds));
            const byId = new Map(originals.map((t) => [t.id, t]));
            const newIds = new Map<number, number>();
            const created: TasksSchemaTypeForSelect[] = [];

            let order = await this.nextBacklogOrder(tx, plan.targetGoalId);
            for (const id of plan.taskIds) {
                const source = byId.get(id);
                if (!source) continue;
                const parentId = id === plan.rootTaskId || source.parentId === null ? null : (newIds.get(source.parentId) ?? null);
                const [copy] = await tx
                    .insert(TasksSchema)
                    .values({
                        goalId: plan.targetGoalId,
                        parentId,
                        description: source.description,
                        complete: source.complete,
                        note: source.note,
                        priorityId: source.priorityId,
                        startDate: source.startDate,
                        endDate: source.endDate,
                        startTime: source.startTime,
                        endTime: source.endTime,
                        amount: source.amount,
                        transactionType: source.transactionType,
                        estimateValue: source.estimateValue,
                        dateComplete: source.dateComplete,
                        sourceUrl: source.sourceUrl,
                        creatorId: args.creatorId,
                        kanbanOrder: order,
                    })
                    .returning();
                order -= TasksRepository.KANBAN_ORDER_GAP;
                newIds.set(id, copy.id);
                created.push(copy);
            }

            const edges = await tx
                .select()
                .from(GraphRelationsSchema)
                .where(and(inArray(GraphRelationsSchema.fromTaskId, plan.taskIds), inArray(GraphRelationsSchema.toTaskId, plan.taskIds)));
            for (const edge of edges) {
                const fromTaskId = edge.fromTaskId === null ? null : newIds.get(edge.fromTaskId);
                const toTaskId = edge.toTaskId === null ? null : newIds.get(edge.toTaskId);
                if (!fromTaskId || !toTaskId) continue;
                await tx.insert(GraphRelationsSchema).values({ fromTaskId, toTaskId, goalId: plan.targetGoalId, nodeMetadata: edge.nodeMetadata });
            }

            return { rootTaskId: newIds.get(plan.rootTaskId) as number, tasks: created };
        });
    }

    private crossingEdges(ids: number[]): SQL {
        const fromInside = inArray(GraphRelationsSchema.fromTaskId, ids);
        const toInside = inArray(GraphRelationsSchema.toTaskId, ids);
        return or(and(fromInside, not(toInside)), and(toInside, not(fromInside))) as SQL;
    }

    private async nextBacklogOrder(tx: Transaction, goalId: number): Promise<number> {
        const [row] = await tx
            .select({ value: min(TasksSchema.kanbanOrder) })
            .from(TasksSchema)
            .where(and(eq(TasksSchema.goalId, goalId), isNull(TasksSchema.statusId)));
        return (row?.value ?? 0) - TasksRepository.KANBAN_ORDER_GAP;
    }
}
