import { and, eq, inArray, isNotNull, ne, notExists, sql } from 'drizzle-orm';
import {
    RecurrenceRulesSchema,
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
import { $logger } from '../../modules/logget';
import { callWithCatch } from '../../utils/helpers';
import type {
    AddSkipDateArgs,
    CreateRuleWithOriginArgs,
    CreateRuleWithOriginResult,
    RecurrenceRulePatchArgs,
    RemoveTemplateAssigneeFromGoalArgs,
} from './types';

const PG_UNIQUE_VIOLATION = '23505';

export class RecurrenceRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
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

    async getTaskById(taskId: number): Promise<TasksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, taskId)).limit(1)
        );
        return result?.[0] ?? null;
    }

    /**
     * Atomic series creation. The origin task row is locked FOR UPDATE, so
     * concurrent creates on the same task serialize: the loser waits on the
     * lock, then sees recurrenceRuleId already set and reports a conflict.
     * The partial unique index uniq_recurrence_rules_template_task backs this
     * up on the DB level. Everything — rule insert, origin attachment (with
     * the window normalized to the series frame) and the assignee/tag
     * snapshot — commits or rolls back together.
     */
    async createWithOriginTask(args: CreateRuleWithOriginArgs): Promise<CreateRuleWithOriginResult> {
        try {
            return await this.db.dbDrizzle.transaction(async (tx) => {
                const taskRows = await tx
                    .select({ recurrenceRuleId: TasksSchema.recurrenceRuleId })
                    .from(TasksSchema)
                    .where(eq(TasksSchema.id, args.originTaskId))
                    .for('update')
                    .limit(1);
                const task = taskRows[0];
                if (!task) return { error: 'not_found' as const };
                if (task.recurrenceRuleId) return { error: 'conflict' as const };

                const ruleRows = await tx.insert(RecurrenceRulesSchema).values(args.rule).returning();
                const rule = ruleRows[0];

                await tx
                    .update(TasksSchema)
                    .set({
                        recurrenceRuleId: rule.id,
                        recurrenceInstanceDate: args.originInstanceDate,
                        startDate: args.window.startDate,
                        startTime: args.window.startTime,
                        endDate: args.window.endDate,
                        endTime: args.window.endTime,
                    })
                    .where(eq(TasksSchema.id, args.originTaskId));

                const [assignees, tags] = await Promise.all([
                    tx
                        .select({ collabUserId: TasksAssigneeSchema.collabUserId })
                        .from(TasksAssigneeSchema)
                        .where(eq(TasksAssigneeSchema.taskId, args.originTaskId)),
                    tx
                        .select({ tagId: TasksToTagsSchema.tagId })
                        .from(TasksToTagsSchema)
                        .where(eq(TasksToTagsSchema.taskId, args.originTaskId)),
                ]);
                if (assignees.length > 0) {
                    await tx
                        .insert(RecurrenceTemplateAssigneesSchema)
                        .values(assignees.map((a) => ({ ruleId: rule.id, collabUserId: a.collabUserId })))
                        .onConflictDoNothing();
                }
                if (tags.length > 0) {
                    await tx
                        .insert(RecurrenceTemplateTagsSchema)
                        .values(tags.map((t) => ({ ruleId: rule.id, tagId: t.tagId })))
                        .onConflictDoNothing();
                }

                return { rule };
            });
        } catch (error) {
            if ((error as { code?: string } | null)?.code === PG_UNIQUE_VIOLATION) {
                return { error: 'conflict' };
            }
            $logger.error(error, '[RecurrenceRepository] createWithOriginTask failed');
            return { error: 'failed' };
        }
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
