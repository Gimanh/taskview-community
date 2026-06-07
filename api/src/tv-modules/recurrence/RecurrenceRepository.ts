import { and, eq, inArray, isNotNull, ne, notExists, sql } from 'drizzle-orm';
import {
    RecurrenceRulesSchema,
    type RecurrenceRulesSchemaTypeForInsert,
    type RecurrenceRulesSchemaTypeForSelect,
    RecurrenceSkipDatesSchema,
    RecurrenceTemplateAssigneesSchema,
    RecurrenceTemplateTagsSchema,
    TasksAssigneeSchema,
    TasksSchema,
    type TasksSchemaTypeForSelect,
    TasksToTagsSchema,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';
import type {
    AddSkipDateArgs,
    ApplyInstanceWindowArgs,
    AttachTaskToRuleArgs,
    RecurrenceRulePatchArgs,
    RemoveTemplateAssigneeFromGoalArgs,
    SetTemplateAssigneesArgs,
    SetTemplateTagsArgs,
} from './types';

export class RecurrenceRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async create(data: RecurrenceRulesSchemaTypeForInsert): Promise<RecurrenceRulesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() => this.db.dbDrizzle.insert(RecurrenceRulesSchema).values(data).returning());
        return result?.[0] ?? null;
    }

    async getById(ruleId: number): Promise<RecurrenceRulesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(RecurrenceRulesSchema).where(eq(RecurrenceRulesSchema.id, ruleId)).limit(1)
        );
        return result?.[0] ?? null;
    }

    async getByTaskId(taskId: number): Promise<RecurrenceRulesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ rule: RecurrenceRulesSchema })
                .from(TasksSchema)
                .innerJoin(RecurrenceRulesSchema, eq(TasksSchema.recurrenceRuleId, RecurrenceRulesSchema.id))
                .where(eq(TasksSchema.id, taskId))
                .limit(1)
        );
        return result?.[0]?.rule ?? null;
    }

    async patch(args: RecurrenceRulePatchArgs): Promise<RecurrenceRulesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(RecurrenceRulesSchema)
                .set({ ...args.patch, editedAt: new Date() })
                .where(eq(RecurrenceRulesSchema.id, args.ruleId))
                .returning()
        );
        return result?.[0] ?? null;
    }

    async deleteById(ruleId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(RecurrenceRulesSchema).where(eq(RecurrenceRulesSchema.id, ruleId))
        );
        return !!result?.rowCount;
    }

    async getSkipDates(ruleId: number): Promise<string[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ skipDate: RecurrenceSkipDatesSchema.skipDate })
                .from(RecurrenceSkipDatesSchema)
                .where(eq(RecurrenceSkipDatesSchema.ruleId, ruleId))
        );
        return result?.map((r) => r.skipDate) ?? [];
    }

    async addSkipDate(args: AddSkipDateArgs): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(RecurrenceSkipDatesSchema)
                .values({ ruleId: args.ruleId, skipDate: args.skipDate })
                .onConflictDoNothing()
        );
    }

    async getTemplateAssignees(ruleId: number): Promise<number[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ collabUserId: RecurrenceTemplateAssigneesSchema.collabUserId })
                .from(RecurrenceTemplateAssigneesSchema)
                .where(eq(RecurrenceTemplateAssigneesSchema.ruleId, ruleId))
        );
        return result?.map((r) => r.collabUserId) ?? [];
    }

    async getTemplateTags(ruleId: number): Promise<number[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ tagId: RecurrenceTemplateTagsSchema.tagId })
                .from(RecurrenceTemplateTagsSchema)
                .where(eq(RecurrenceTemplateTagsSchema.ruleId, ruleId))
        );
        return result?.map((r) => r.tagId) ?? [];
    }

    async setTemplateAssignees(args: SetTemplateAssigneesArgs): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.transaction(async (tx) => {
                await tx.delete(RecurrenceTemplateAssigneesSchema).where(eq(RecurrenceTemplateAssigneesSchema.ruleId, args.ruleId));
                if (args.collabUserIds.length > 0) {
                    await tx
                        .insert(RecurrenceTemplateAssigneesSchema)
                        .values(args.collabUserIds.map((collabUserId) => ({ ruleId: args.ruleId, collabUserId })))
                        .onConflictDoNothing();
                }
            })
        );
    }

    async setTemplateTags(args: SetTemplateTagsArgs): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.transaction(async (tx) => {
                await tx.delete(RecurrenceTemplateTagsSchema).where(eq(RecurrenceTemplateTagsSchema.ruleId, args.ruleId));
                if (args.tagIds.length > 0) {
                    await tx
                        .insert(RecurrenceTemplateTagsSchema)
                        .values(args.tagIds.map((tagId) => ({ ruleId: args.ruleId, tagId })))
                        .onConflictDoNothing();
                }
            })
        );
    }

    /** Drops an ex-collaborator from the assignee snapshot of every rule in the goal. */
    async removeTemplateAssigneeFromGoal(args: RemoveTemplateAssigneeFromGoalArgs): Promise<void> {
        const goalRules = this.db.dbDrizzle
            .select({ id: RecurrenceRulesSchema.id })
            .from(RecurrenceRulesSchema)
            .where(eq(RecurrenceRulesSchema.goalId, args.goalId));
        await callWithCatch(() =>
            this.db.dbDrizzle
                .delete(RecurrenceTemplateAssigneesSchema)
                .where(
                    and(
                        eq(RecurrenceTemplateAssigneesSchema.collabUserId, args.collabUserId),
                        inArray(RecurrenceTemplateAssigneesSchema.ruleId, goalRules)
                    )
                )
        );
    }

    async getTaskAssignees(taskId: number): Promise<number[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ collabUserId: TasksAssigneeSchema.collabUserId })
                .from(TasksAssigneeSchema)
                .where(eq(TasksAssigneeSchema.taskId, taskId))
        );
        return result?.map((r) => r.collabUserId) ?? [];
    }

    async getTaskTags(taskId: number): Promise<number[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ tagId: TasksToTagsSchema.tagId })
                .from(TasksToTagsSchema)
                .where(eq(TasksToTagsSchema.taskId, taskId))
        );
        return result?.map((r) => r.tagId) ?? [];
    }

    async getTaskById(taskId: number): Promise<TasksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, taskId)).limit(1)
        );
        return result?.[0] ?? null;
    }

    async attachTaskToRule(args: AttachTaskToRuleArgs): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TasksSchema)
                .set({ recurrenceRuleId: args.ruleId, recurrenceInstanceDate: args.instanceDate })
                .where(eq(TasksSchema.id, args.taskId))
        );
        return !!result?.rowCount;
    }

    /** Aligns a task's start/end window with the series frame (used to normalize the origin instance). */
    async applyInstanceWindow(args: ApplyInstanceWindowArgs): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TasksSchema)
                .set({
                    startDate: args.window.startDate,
                    startTime: args.window.startTime,
                    endDate: args.window.endDate,
                    endTime: args.window.endTime,
                })
                .where(eq(TasksSchema.id, args.taskId))
        );
    }

    /** The single not-completed instance of the rule (the lazy model keeps at most one). */
    async findOpenInstance(ruleId: number): Promise<TasksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TasksSchema)
                .where(and(eq(TasksSchema.recurrenceRuleId, ruleId), ne(sql`COALESCE(${TasksSchema.complete}, false)`, sql`true`)))
                .limit(1)
        );
        return result?.[0] ?? null;
    }

    /** Active rules with no open instance — the reconcile sweep input. Empty in normal operation. */
    async findStalledActiveRules(): Promise<RecurrenceRulesSchemaTypeForSelect[]> {
        const openInstance = this.db.dbDrizzle
            .select({ one: sql`1` })
            .from(TasksSchema)
            .where(
                and(
                    eq(TasksSchema.recurrenceRuleId, RecurrenceRulesSchema.id),
                    isNotNull(TasksSchema.recurrenceRuleId),
                    ne(sql`COALESCE(${TasksSchema.complete}, false)`, sql`true`)
                )
            );
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(RecurrenceRulesSchema)
                .where(and(eq(RecurrenceRulesSchema.state, 'active'), notExists(openInstance)))
        );
        return result ?? [];
    }
}
