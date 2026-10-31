import { and, count, desc, eq, gte, inArray, lt, ne } from 'drizzle-orm';
import {
    CollaborationUsersSchema,
    CollaborationUsersToGoalsSchema,
    GoalsListSchema,
    ImportJobsSchema,
    OrganizationMembersSchema,
    TagsSchema,
    TasksAssigneeSchema,
    TasksSchema,
    TasksStatusesSchema,
    TasksToTagsSchema,
    type ImportJobsSchemaTypeForSelect,
    type ImportJobStatus,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';
import type {
    ImportRepoAssigneeRow,
    ImportRepoCreateJobArgs,
    ImportRepoFetchJobsArgs,
    ImportRepoFinishJobArgs,
    ImportRepoGoalCollaboratorArgs,
    ImportRepoListRow,
    ImportRepoOrgMembersArgs,
    ImportRepoQueueJobArgs,
    ImportRepoRecentDraftsArgs,
    ImportRepoSetGoalArgs,
    ImportRepoSetProgressArgs,
    ImportRepoStatusRow,
    ImportRepoTagRow,
    ImportRepoTaskRow,
    ImportRepoTaskTagRow,
} from './types';

const JOB_HISTORY_LIMIT = 50;
const INSERT_CHUNK_SIZE = 500;

export class ImportRepository {
    private readonly db = Database.getInstance();

    async createJob(args: ImportRepoCreateJobArgs): Promise<ImportJobsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(ImportJobsSchema)
                .values({
                    organizationId: args.organizationId,
                    createdBy: args.createdBy,
                    provider: args.provider,
                    credentialsEncrypted: args.credentialsEncrypted,
                    accountName: args.accountName,
                    status: 'draft',
                })
                .returning(),
        );
        return result?.[0] ?? null;
    }

    async fetchJob(id: number): Promise<ImportJobsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(ImportJobsSchema).where(eq(ImportJobsSchema.id, id)).limit(1),
        );
        return result?.[0] ?? null;
    }

    async fetchJobs(args: ImportRepoFetchJobsArgs): Promise<ImportJobsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(ImportJobsSchema)
                .where(
                    and(
                        eq(ImportJobsSchema.organizationId, args.organizationId),
                        eq(ImportJobsSchema.createdBy, args.createdBy),
                        ne(ImportJobsSchema.status, 'draft'),
                    ),
                )
                .orderBy(desc(ImportJobsSchema.createdAt))
                .limit(JOB_HISTORY_LIMIT),
        );
        return result ?? [];
    }

    async queueJob(args: ImportRepoQueueJobArgs): Promise<ImportJobsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(ImportJobsSchema)
                .set({
                    status: 'pending',
                    externalProjectId: args.externalProjectId,
                    externalProjectName: args.externalProjectName,
                    config: args.config,
                })
                .where(and(eq(ImportJobsSchema.id, args.id), eq(ImportJobsSchema.status, 'draft')))
                .returning(),
        );
        return result?.[0] ?? null;
    }

    async countJobsCreatedSince(args: ImportRepoRecentDraftsArgs): Promise<number> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ total: count() })
                .from(ImportJobsSchema)
                .where(and(eq(ImportJobsSchema.createdBy, args.createdBy), gte(ImportJobsSchema.createdAt, args.since))),
        );
        return result?.[0]?.total ?? 0;
    }

    async hasActiveJob(createdBy: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: ImportJobsSchema.id })
                .from(ImportJobsSchema)
                .where(and(eq(ImportJobsSchema.createdBy, createdBy), inArray(ImportJobsSchema.status, ['pending', 'running'])))
                .limit(1),
        );
        return (result?.length ?? 0) > 0;
    }

    async revertToDraft(id: number): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle
                .update(ImportJobsSchema)
                .set({ status: 'draft' })
                .where(and(eq(ImportJobsSchema.id, id), eq(ImportJobsSchema.status, 'pending'))),
        );
    }

    async markRunning(id: number): Promise<ImportJobsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(ImportJobsSchema)
                .set({ status: 'running', startedAt: new Date() })
                .where(and(eq(ImportJobsSchema.id, id), eq(ImportJobsSchema.status, 'pending')))
                .returning(),
        );
        return result?.[0] ?? null;
    }

    async fetchStatus(id: number): Promise<ImportJobStatus | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ status: ImportJobsSchema.status }).from(ImportJobsSchema).where(eq(ImportJobsSchema.id, id)).limit(1),
        );
        return result?.[0]?.status ?? null;
    }

    async setGoal(args: ImportRepoSetGoalArgs): Promise<void> {
        await this.db.dbDrizzle.update(ImportJobsSchema).set({ goalId: args.goalId }).where(eq(ImportJobsSchema.id, args.id));
    }

    async setProgress(args: ImportRepoSetProgressArgs): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.update(ImportJobsSchema).set({ progress: args.progress }).where(eq(ImportJobsSchema.id, args.id)),
        );
    }

    async finishJob(args: ImportRepoFinishJobArgs): Promise<ImportJobsSchemaTypeForSelect | null> {
        const finishableStatuses: ImportJobStatus[] = args.status === 'cancelled' ? ['running', 'cancelled'] : ['running'];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(ImportJobsSchema)
                .set({
                    status: args.status,
                    stats: args.stats,
                    error: args.error,
                    credentialsEncrypted: null,
                    finishedAt: new Date(),
                })
                .where(and(eq(ImportJobsSchema.id, args.id), inArray(ImportJobsSchema.status, finishableStatuses)))
                .returning(),
        );
        return result?.[0] ?? null;
    }

    async cancelJob(id: number): Promise<ImportJobsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(ImportJobsSchema)
                .set({ status: 'cancelled', credentialsEncrypted: null, finishedAt: new Date() })
                .where(and(eq(ImportJobsSchema.id, id), inArray(ImportJobsSchema.status, ['draft', 'pending', 'running'])))
                .returning(),
        );
        return result?.[0] ?? null;
    }

    async deleteDraftsCreatedBefore(before: Date): Promise<number> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .delete(ImportJobsSchema)
                .where(and(eq(ImportJobsSchema.status, 'draft'), lt(ImportJobsSchema.createdAt, before))),
        );
        return result?.rowCount ?? 0;
    }

    async expirePendingCreatedBefore(before: Date): Promise<number> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(ImportJobsSchema)
                .set({ status: 'failed', error: 'interrupted', credentialsEncrypted: null, finishedAt: new Date() })
                .where(and(eq(ImportJobsSchema.status, 'pending'), lt(ImportJobsSchema.createdAt, before)))
                .returning({ id: ImportJobsSchema.id }),
        );
        return result?.length ?? 0;
    }

    async fetchRunningStartedBefore(before: Date): Promise<ImportJobsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(ImportJobsSchema)
                .where(and(eq(ImportJobsSchema.status, 'running'), lt(ImportJobsSchema.startedAt, before))),
        );
        return result ?? [];
    }

    async fetchOrgMembers(args: ImportRepoOrgMembersArgs): Promise<{ id: number; email: string }[]> {
        if (args.memberIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: OrganizationMembersSchema.id, email: OrganizationMembersSchema.email })
                .from(OrganizationMembersSchema)
                .where(
                    and(
                        eq(OrganizationMembersSchema.organizationId, args.organizationId),
                        inArray(OrganizationMembersSchema.id, args.memberIds),
                    ),
                ),
        );
        return result ?? [];
    }

    async fetchCollaboratorIds(args: ImportRepoGoalCollaboratorArgs): Promise<Map<string, number>> {
        if (args.emails.length === 0) return new Map();
        const rows = await this.db.dbDrizzle
            .select({ id: CollaborationUsersSchema.id, email: CollaborationUsersSchema.email })
            .from(CollaborationUsersToGoalsSchema)
            .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id))
            .where(and(eq(CollaborationUsersToGoalsSchema.goalId, args.goalId), inArray(CollaborationUsersSchema.email, args.emails)));
        return new Map(rows.map((row) => [row.email, row.id]));
    }

    async deleteStatusesOfGoal(goalId: number): Promise<void> {
        await this.db.dbDrizzle.delete(TasksStatusesSchema).where(eq(TasksStatusesSchema.goalId, goalId));
    }

    async insertStatuses(rows: ImportRepoStatusRow[]): Promise<number[]> {
        const ids: number[] = [];
        // One row per statement: the view_order trigger numbers columns by MAX + 1
        for (const row of rows) {
            const [inserted] = await this.db.dbDrizzle
                .insert(TasksStatusesSchema)
                .values({ goalId: row.goalId, name: row.name })
                .returning({ id: TasksStatusesSchema.id });
            ids.push(inserted.id);
        }
        return ids;
    }

    async insertLists(rows: ImportRepoListRow[]): Promise<number[]> {
        return this.insertChunked(rows, (chunk) =>
            this.db.dbDrizzle
                .insert(GoalsListSchema)
                .values(chunk.map((row) => ({ goalId: row.goalId, name: row.name, creatorId: row.creatorId })))
                .returning({ id: GoalsListSchema.id }),
        );
    }

    async insertTags(rows: ImportRepoTagRow[]): Promise<number[]> {
        return this.insertChunked(rows, (chunk) =>
            this.db.dbDrizzle
                .insert(TagsSchema)
                .values(chunk.map((row) => ({ goalId: row.goalId, name: row.name, color: row.color, owner: row.owner })))
                .returning({ id: TagsSchema.id }),
        );
    }

    async insertTasks(rows: ImportRepoTaskRow[]): Promise<number[]> {
        return this.insertChunked(rows, (chunk) =>
            this.db.dbDrizzle
                .insert(TasksSchema)
                .values(
                    chunk.map((row) => ({
                        goalId: row.goalId,
                        parentId: row.parentId,
                        description: row.description,
                        note: row.note,
                        sourceUrl: row.sourceUrl,
                        statusId: row.statusId,
                        goalListId: row.goalListId,
                        startDate: row.startDate,
                        endDate: row.endDate,
                        priorityId: row.priorityId,
                        complete: row.complete,
                        dateComplete: row.dateComplete,
                        kanbanOrder: row.kanbanOrder,
                        creatorId: row.creatorId,
                    })),
                )
                .returning({ id: TasksSchema.id }),
        );
    }

    async insertTaskTags(rows: ImportRepoTaskTagRow[]): Promise<void> {
        await this.insertChunked(rows, async (chunk) => {
            await this.db.dbDrizzle.insert(TasksToTagsSchema).values(chunk.map((row) => ({ taskId: row.taskId, tagId: row.tagId })));
            return [];
        });
    }

    async insertAssignees(rows: ImportRepoAssigneeRow[]): Promise<void> {
        await this.insertChunked(rows, async (chunk) => {
            await this.db.dbDrizzle
                .insert(TasksAssigneeSchema)
                .values(chunk.map((row) => ({ taskId: row.taskId, collabUserId: row.collabUserId })));
            return [];
        });
    }

    private async insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<{ id: number }[]>): Promise<number[]> {
        const ids: number[] = [];
        for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
            const inserted = await insert(rows.slice(i, i + INSERT_CHUNK_SIZE));
            ids.push(...inserted.map((row) => row.id));
        }
        return ids;
    }
}
