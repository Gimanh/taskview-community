import { and, eq, ne, isNull, sql } from 'drizzle-orm';
import { IntegrationsSchema, IntegrationTaskMapSchema, TasksSchema, UsersSchema, type IntegrationsSchemaTypeForSelect, type IntegrationTaskMapSchemaTypeForSelect } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';
import type { IntegrationsArgAdd, IntegrationsArgDelete, IntegrationsArgSelectRepo, IntegrationsArgToggle } from './types';
import { TasksRepository } from '../tasks/TasksRepository';

export class IntegrationsRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async create(data: IntegrationsArgAdd): Promise<IntegrationsSchemaTypeForSelect | false> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(IntegrationsSchema).values({
                provider: data.provider,
                repoFullName: data.repoFullName,
                projectId: data.projectId,
            }).returning()
        );
        if (!result) return false;
        return result[0];
    }

    async delete(data: IntegrationsArgDelete): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(IntegrationsSchema).where(eq(IntegrationsSchema.id, data.id))
        );
        if (!result) return false;
        return !!(result?.rowCount && result.rowCount > 0);
    }

    async toggle(data: IntegrationsArgToggle): Promise<IntegrationsSchemaTypeForSelect | false> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(IntegrationsSchema)
                .set({ isActive: data.isActive, updatedAt: new Date() })
                .where(eq(IntegrationsSchema.id, data.id))
                .returning()
        );
        if (!result) return false;
        return result[0];
    }

    async fetchByProjectId(projectId: number): Promise<IntegrationsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(IntegrationsSchema)
                .where(eq(IntegrationsSchema.projectId, projectId))
        );
        if (!result) return [];
        return result;
    }

    async fetchById(id: number): Promise<IntegrationsSchemaTypeForSelect | undefined> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(IntegrationsSchema)
                .where(eq(IntegrationsSchema.id, id))
        );
        if (!result || result.length === 0) return undefined;
        return result[0];
    }

    async createWithToken(
        provider: 'github' | 'gitlab',
        projectId: number,
        accessTokenEncrypted: string,
        refreshTokenEncrypted?: string | null,
    ): Promise<IntegrationsSchemaTypeForSelect | false> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(IntegrationsSchema).values({
                provider,
                projectId,
                accessTokenEncrypted,
                refreshTokenEncrypted: refreshTokenEncrypted ?? null,
            }).returning()
        );
        if (!result) return false;
        return result[0];
    }

    async existsRepoInProject(projectId: number, repoFullName: string, excludeIntegrationId?: number): Promise<boolean> {
        const conditions = [
            eq(IntegrationsSchema.projectId, projectId),
            eq(IntegrationsSchema.repoFullName, repoFullName),
        ];
        if (excludeIntegrationId) {
            conditions.push(ne(IntegrationsSchema.id, excludeIntegrationId));
        }
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ id: IntegrationsSchema.id }).from(IntegrationsSchema)
                .where(and(...conditions))
        );
        return !!result && result.length > 0;
    }

    async updateRepo(data: IntegrationsArgSelectRepo): Promise<IntegrationsSchemaTypeForSelect | false> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(IntegrationsSchema)
                .set({
                    repoFullName: data.repoFullName,
                    repoExternalId: data.repoExternalId,
                    updatedAt: new Date(),
                })
                .where(eq(IntegrationsSchema.id, data.integrationId))
                .returning()
        );
        if (!result) return false;
        return result[0];
    }

    async createTaskAndMapping(
        goalId: number,
        description: string,
        integrationId: number,
        issueNumber: number,
        issueState: string,
        note?: string | null,
        complete?: boolean,
        sourceUrl?: string | null,
    ): Promise<IntegrationTaskMapSchemaTypeForSelect | false> {
        const tasksRepo = new TasksRepository();
        const kanbanOrder = await tasksRepo.getNextKanbanOrder(goalId);

        const result = await callWithCatch(async () => {
            const [task] = await this.db.dbDrizzle.insert(TasksSchema).values({
                goalId,
                description,
                complete: complete ?? false,
                note: note || null,
                kanbanOrder,
                sourceUrl: sourceUrl || null,
            }).returning();
            const [mapping] = await this.db.dbDrizzle.insert(IntegrationTaskMapSchema).values({
                integrationId,
                taskId: task.id,
                issueNumber,
                issueState,
            }).returning();
            return mapping;
        });
        if (!result) return false;
        return result;
    }

    async fetchMappingsByIntegrationId(integrationId: number): Promise<IntegrationTaskMapSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(IntegrationTaskMapSchema)
                .where(eq(IntegrationTaskMapSchema.integrationId, integrationId))
        );
        if (!result) return [];
        return result;
    }

    async updateTokens(integrationId: number, accessTokenEncrypted: string, refreshTokenEncrypted: string | null): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(IntegrationsSchema)
                .set({ accessTokenEncrypted, refreshTokenEncrypted, updatedAt: new Date() })
                .where(eq(IntegrationsSchema.id, integrationId))
        );
        return !!result;
    }

    async updateWebhook(integrationId: number, webhookId: string, webhookSecretEncrypted: string): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(IntegrationsSchema)
                .set({ webhookId, webhookSecretEncrypted, updatedAt: new Date() })
                .where(eq(IntegrationsSchema.id, integrationId))
        );
        return !!result;
    }

    async fetchAllActiveByRepoFullName(repoFullName: string): Promise<IntegrationsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(IntegrationsSchema)
                .where(
                    and(
                        eq(IntegrationsSchema.repoFullName, repoFullName),
                        eq(IntegrationsSchema.isActive, true),
                    )
                )
        );
        return result || [];
    }

    async fetchAllActiveByRepoExternalId(repoExternalId: string): Promise<IntegrationsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(IntegrationsSchema)
                .where(
                    and(
                        eq(IntegrationsSchema.repoExternalId, repoExternalId),
                        eq(IntegrationsSchema.isActive, true),
                    )
                )
        );
        return result || [];
    }

    async fetchMappingByIssueNumber(integrationId: number, issueNumber: number): Promise<IntegrationTaskMapSchemaTypeForSelect | undefined> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(IntegrationTaskMapSchema)
                .where(
                    and(
                        eq(IntegrationTaskMapSchema.integrationId, integrationId),
                        eq(IntegrationTaskMapSchema.issueNumber, issueNumber),
                    )
                )
        );
        if (!result || result.length === 0) return undefined;
        return result[0];
    }

    async fetchMappingByTaskId(taskId: number): Promise<(IntegrationTaskMapSchemaTypeForSelect & { integration: IntegrationsSchemaTypeForSelect }) | undefined> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(IntegrationTaskMapSchema)
                .innerJoin(IntegrationsSchema, eq(IntegrationTaskMapSchema.integrationId, IntegrationsSchema.id))
                .where(eq(IntegrationTaskMapSchema.taskId, taskId))
        );
        if (!result || result.length === 0) return undefined;
        return {
            ...result[0].integration_task_map,
            integration: result[0].integrations,
        };
    }

    async updateTaskComplete(taskId: number, complete: boolean): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(TasksSchema)
                .set({ complete })
                .where(eq(TasksSchema.id, taskId))
        );
        return !!result;
    }

    async updateTaskTitleAndNote(taskId: number, description: string, note: string | null): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(TasksSchema)
                .set({ description, note })
                .where(eq(TasksSchema.id, taskId))
        );
        return !!result;
    }

    async updateTaskSourceUrl(taskId: number, sourceUrl: string): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(TasksSchema)
                .set({ sourceUrl })
                .where(eq(TasksSchema.id, taskId))
        );
        return !!result;
    }

    async backfillSourceUrls(integrationId: number, urlPrefix: string): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.execute(sql`
                UPDATE tasks.tasks t
                SET source_url = ${urlPrefix} || m.issue_number
                FROM tasks.integration_task_map m
                WHERE m.task_id = t.id
                  AND m.integration_id = ${integrationId}
                  AND t.source_url IS NULL
            `)
        );
        return !!result;
    }

    async updateMappingState(mappingId: number, issueState: string): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(IntegrationTaskMapSchema)
                .set({ issueState, syncedAt: new Date() })
                .where(eq(IntegrationTaskMapSchema.id, mappingId))
        );
        return !!result;
    }

    async createTasksAndMappingsBatch(
        items: Array<{ goalId: number; description: string; integrationId: number; issueNumber: number; issueState: string; note: string | null; complete: boolean; kanbanOrder: number; sourceUrl: string | null }>,
    ): Promise<number> {
        if (items.length === 0) return 0;
        let created = 0;
        const BATCH_SIZE = 100;

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            const result = await callWithCatch(async () => {
                const tasks = await this.db.dbDrizzle.insert(TasksSchema).values(
                    batch.map((item) => ({
                        goalId: item.goalId,
                        description: item.description,
                        complete: item.complete,
                        note: item.note,
                        kanbanOrder: item.kanbanOrder,
                        sourceUrl: item.sourceUrl,
                    })),
                ).returning({ id: TasksSchema.id });

                await this.db.dbDrizzle.insert(IntegrationTaskMapSchema).values(
                    tasks.map((task, idx) => ({
                        integrationId: batch[idx].integrationId,
                        taskId: task.id,
                        issueNumber: batch[idx].issueNumber,
                        issueState: batch[idx].issueState,
                    })),
                );

                return tasks.length;
            });
            if (result) created += result;
        }

        return created;
    }

    async updateLastSyncedAt(integrationId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(IntegrationsSchema)
                .set({ lastSyncedAt: new Date() })
                .where(eq(IntegrationsSchema.id, integrationId))
        );
        return !!result;
    }

    async fetchUserLogin(userId: number): Promise<string | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ login: UsersSchema.login }).from(UsersSchema)
                .where(eq(UsersSchema.id, userId))
        );
        if (!result || result.length === 0) return null;
        return result[0].login;
    }

}
