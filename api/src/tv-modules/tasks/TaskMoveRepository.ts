import { and, count, countDistinct, eq, inArray, isNotNull, isNull, ilike, min, not, notInArray, or, sum, type SQL } from 'drizzle-orm';
import {
    FileToTaskSchema,
    FilesSchema,
    GoalsSchema,
    GraphRelationsSchema,
    IntegrationTaskMapSchema,
    OrganizationsSchema,
    RecurrenceRulesSchema,
    SprintTaskOutcomesSchema,
    TasksAssigneeSchema,
    TasksSchema,
    type TasksSchemaTypeForSelect,
    TasksToTagsSchema,
    TimeEntriesSchema,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { TaskNoteFileRefs } from './TaskNoteFileRefs';
import { TasksRepository } from './TasksRepository';
import type {
    TaskCopyExecuteArgs,
    TaskCopyResult,
    TaskMoveAttachCopiesArgs,
    TaskMoveContext,
    TaskMoveContextArgs,
    TaskMoveCountArgs,
    TaskMoveExecuteArgs,
    TaskMoveFileCopies,
    TaskMoveFileCopy,
    TaskMoveRemovals,
    TaskMoveTimeEntryCountArgs,
    TaskNote,
    TaskNoteFile,
    TaskNoteFilesInGoalArgs,
    TaskNoteSharedFilesArgs,
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
            fileLinks: await total(db.select({ value: count() }).from(FileToTaskSchema).where(this.removedFileLinks(args))),
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

    async fetchNotes(taskIds: number[]): Promise<TaskNote[]> {
        if (taskIds.length === 0) return [];
        return this.db.dbDrizzle.select({ id: TasksSchema.id, note: TasksSchema.note }).from(TasksSchema).where(inArray(TasksSchema.id, taskIds));
    }

    async fetchFilesInGoal(args: TaskNoteFilesInGoalArgs): Promise<TaskNoteFile[]> {
        if (args.fileIds.length === 0) return [];
        return this.db.dbDrizzle
            .select({ id: FilesSchema.id, sizeBytes: FilesSchema.sizeBytes, storageProvider: FilesSchema.storageProvider })
            .from(FilesSchema)
            .where(and(inArray(FilesSchema.id, args.fileIds), eq(FilesSchema.goalId, args.goalId)))
            .orderBy(FilesSchema.createdAt, FilesSchema.id);
    }

    // Files that tasks staying in the source project also use: attached to them or shown in their notes
    async findSharedFileIds(args: TaskNoteSharedFilesArgs): Promise<Set<string>> {
        const shared = new Set<string>();
        if (args.fileIds.length === 0) return shared;

        const links = await this.db.dbDrizzle
            .select({ fileId: FileToTaskSchema.fileId })
            .from(FileToTaskSchema)
            .where(and(inArray(FileToTaskSchema.fileId, args.fileIds), notInArray(FileToTaskSchema.taskId, args.taskIds)));
        for (const link of links) shared.add(link.fileId);

        const notes = await this.db.dbDrizzle
            .select({ note: TasksSchema.note })
            .from(TasksSchema)
            .where(
                and(
                    eq(TasksSchema.goalId, args.goalId),
                    notInArray(TasksSchema.id, args.taskIds),
                    or(...args.fileIds.map((fileId) => ilike(TasksSchema.note, `%${fileId}%`)))
                )
            );
        const wanted = new Set(args.fileIds);
        for (const { note } of notes) {
            for (const fileId of TaskNoteFileRefs.extract(note)) if (wanted.has(fileId)) shared.add(fileId);
        }
        return shared;
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
            const [locked] = await tx
                .select({ goalId: TasksSchema.goalId })
                .from(TasksSchema)
                .where(eq(TasksSchema.id, plan.rootTaskId))
                .for('update');
            // A repeated request planned before the first one finished finds the task already gone from the source project
            if (!locked || locked.goalId !== plan.sourceGoalId) return null;
            await this.lockBacklog(tx, plan.targetGoalId);

            await tx.delete(TasksToTagsSchema).where(inArray(TasksToTagsSchema.taskId, ids));
            await tx.delete(TasksAssigneeSchema).where(inArray(TasksAssigneeSchema.taskId, ids));
            await tx.delete(FileToTaskSchema).where(this.removedFileLinks({ taskIds: ids, keptFileIds: plan.noteFiles.moveIds }));
            await this.moveNoteFiles(tx, args);
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

            await this.attachFileCopies(tx, { fileCopies: args.fileCopies, taskIds: ids });

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

            await this.lockBacklog(tx, plan.targetGoalId);
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

            const createdIds = created.map((task) => task.id);
            const rewritten = await this.attachFileCopies(tx, { fileCopies: args.fileCopies, taskIds: createdIds });
            const tasks = rewritten ? await this.reload(tx, createdIds) : created;

            return { rootTaskId: newIds.get(plan.rootTaskId) as number, tasks };
        });
    }

    private removedFileLinks(args: TaskMoveCountArgs): SQL {
        const ofTasks = inArray(FileToTaskSchema.taskId, args.taskIds);
        if (args.keptFileIds.length === 0) return ofTasks;
        return and(ofTasks, notInArray(FileToTaskSchema.fileId, args.keptFileIds)) as SQL;
    }

    private async moveNoteFiles(tx: Transaction, args: TaskMoveExecuteArgs): Promise<void> {
        const { plan } = args;
        if (plan.noteFiles.moveIds.length === 0) return;
        // A link added after the plan was made would otherwise tie the moved file to a task of the old project
        await tx
            .delete(FileToTaskSchema)
            .where(and(inArray(FileToTaskSchema.fileId, plan.noteFiles.moveIds), notInArray(FileToTaskSchema.taskId, plan.taskIds)));
        await tx
            .update(FilesSchema)
            .set({ goalId: plan.targetGoalId, editedAt: new Date() })
            .where(and(inArray(FilesSchema.id, plan.noteFiles.moveIds), eq(FilesSchema.goalId, plan.sourceGoalId)));
    }

    // Saves the copies, attaches each to the tasks showing it and points their notes at the copy; true when a note changed
    private async attachFileCopies(tx: Transaction, args: TaskMoveAttachCopiesArgs): Promise<boolean> {
        const copies = await this.copiesWithinQuota(tx, args.fileCopies);
        if (copies.length === 0) return false;
        await tx.insert(FilesSchema).values(copies.map((copy) => copy.row));

        const replacements = new Map(copies.map((copy) => [copy.sourceId, copy.row.id as string]));
        const tasks = await tx.select({ id: TasksSchema.id, note: TasksSchema.note }).from(TasksSchema).where(inArray(TasksSchema.id, args.taskIds));
        let changed = false;
        for (const task of tasks) {
            if (!task.note) continue;
            const used = TaskNoteFileRefs.extract(task.note).filter((fileId) => replacements.has(fileId));
            if (used.length === 0) continue;
            await tx
                .update(TasksSchema)
                .set({ note: TaskNoteFileRefs.replace({ note: task.note, replacements }) })
                .where(eq(TasksSchema.id, task.id));
            await tx.insert(FileToTaskSchema).values(
                used.map((fileId) => ({
                    fileId: replacements.get(fileId) as string,
                    taskId: task.id,
                    linkedById: args.fileCopies.linkedById,
                    linkedByEmail: args.fileCopies.linkedByEmail,
                }))
            );
            changed = true;
        }
        return changed;
    }

    private async copiesWithinQuota(tx: Transaction, fileCopies: TaskMoveFileCopies): Promise<TaskMoveFileCopy[]> {
        const { quota } = fileCopies;
        if (fileCopies.items.length === 0 || quota === null) return fileCopies.items;

        await tx.select({ id: OrganizationsSchema.id }).from(OrganizationsSchema).where(eq(OrganizationsSchema.id, quota.organizationId)).for('update');
        const [usage] = await tx
            .select({ total: sum(FilesSchema.sizeBytes) })
            .from(FilesSchema)
            .innerJoin(GoalsSchema, eq(GoalsSchema.id, FilesSchema.goalId))
            .where(eq(GoalsSchema.organizationId, quota.organizationId));
        let usedBytes = Number(usage?.total ?? 0);
        return fileCopies.items.filter((copy) => {
            if (usedBytes + copy.row.sizeBytes > quota.quotaBytes) return false;
            usedBytes += copy.row.sizeBytes;
            return true;
        });
    }

    private async reload(tx: Transaction, taskIds: number[]): Promise<TasksSchemaTypeForSelect[]> {
        const rows = await tx.select().from(TasksSchema).where(inArray(TasksSchema.id, taskIds));
        const byId = new Map(rows.map((row) => [row.id, row]));
        return taskIds.map((id) => byId.get(id)).filter((row): row is TasksSchemaTypeForSelect => row !== undefined);
    }

    private crossingEdges(ids: number[]): SQL {
        const fromInside = inArray(GraphRelationsSchema.fromTaskId, ids);
        const toInside = inArray(GraphRelationsSchema.toTaskId, ids);
        return or(and(fromInside, not(toInside)), and(toInside, not(fromInside))) as SQL;
    }

    // Two moves into one project would otherwise read the same free position and collide on the unique order
    private async lockBacklog(tx: Transaction, goalId: number): Promise<void> {
        await tx.select({ id: GoalsSchema.id }).from(GoalsSchema).where(eq(GoalsSchema.id, goalId)).for('update');
    }

    private async nextBacklogOrder(tx: Transaction, goalId: number): Promise<number> {
        const [row] = await tx
            .select({ value: min(TasksSchema.kanbanOrder) })
            .from(TasksSchema)
            .where(and(eq(TasksSchema.goalId, goalId), isNull(TasksSchema.statusId)));
        return (row?.value ?? 0) - TasksRepository.KANBAN_ORDER_GAP;
    }
}
