import { and, asc, eq, ne, sql } from 'drizzle-orm';
import {
    GoalsListSchema,
    RecurrenceRulesSchema,
    type RecurrenceRulesSchemaTypeForSelect,
    RecurrenceSkipDatesSchema,
    RecurrenceTemplateAssigneesSchema,
    RecurrenceTemplateTagsSchema,
    TasksAssigneeSchema,
    TasksSchema,
    type TasksSchemaTypeForSelect,
    TasksStatusesSchema,
    TasksToTagsSchema,
} from 'taskview-db-schemas';
import { eventBus } from '../../core/EventBus';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import { TasksRepository } from '../tasks/TasksRepository';
import { RecurrenceParser } from './RecurrenceParser';
import type { MaterializeNextArgs } from './types';

/**
 * Materializes the next instance of a series. The lazy model invariant — at
 * most one open instance per rule — is protected on two levels: the rule row
 * is locked FOR UPDATE for the duration of the transaction (serializes the
 * complete-trigger against the reconcile job and rule edits), and the partial
 * unique index on (recurrence_rule_id, recurrence_instance_date) makes the
 * insert idempotent even across processes.
 */
export class RecurrenceGenerator {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async materializeNext(args: MaterializeNextArgs): Promise<TasksSchemaTypeForSelect | null> {
        const db = this.db.dbDrizzle;

        const outcome = await db
            .transaction(async (tx) => {
                const ruleRows = await tx
                    .select()
                    .from(RecurrenceRulesSchema)
                    .where(eq(RecurrenceRulesSchema.id, args.ruleId))
                    .for('update')
                    .limit(1);
                const rule = ruleRows[0];
                if (!rule || rule.state !== 'active') return null;

                // Lazy-model invariant: at most one open instance per rule. Without
                // this guard a duplicate trigger (repeated PATCH complete=true, or
                // reconcile racing the event handler) would materialize a SECOND
                // open instance on the next date — the unique index only catches
                // same-date duplicates.
                const openRows = await tx
                    .select({ id: TasksSchema.id })
                    .from(TasksSchema)
                    .where(
                        and(
                            eq(TasksSchema.recurrenceRuleId, rule.id),
                            ne(sql`COALESCE(${TasksSchema.complete}, false)`, sql`true`)
                        )
                    )
                    .limit(1);
                if (openRows[0]) return null;

                // "N materialized instances" cap for COUNT-series.
                const count = RecurrenceParser.getCount(rule.rrule);
                if (count !== null && rule.instancesCreated >= count) {
                    await tx
                        .update(RecurrenceRulesSchema)
                        .set({ state: 'ended', editedAt: new Date() })
                        .where(eq(RecurrenceRulesSchema.id, rule.id));
                    return { ended: rule } as const;
                }

                const skipRows = await tx
                    .select({ skipDate: RecurrenceSkipDatesSchema.skipDate })
                    .from(RecurrenceSkipDatesSchema)
                    .where(eq(RecurrenceSkipDatesSchema.ruleId, rule.id));
                const skipDates = new Set(skipRows.map((r) => r.skipDate));

                // Completed late → next from today, not a pile of overdue copies (Todoist behavior).
                const today = RecurrenceParser.todayInTimezone(rule.timezone);
                const afterDate = rule.lastInstanceDate > today ? rule.lastInstanceDate : today;
                const nextDate = RecurrenceParser.nextOccurrenceDate({
                    rrule: rule.rrule,
                    dtstart: rule.dtstart,
                    afterDate,
                    skipDates,
                });
                if (!nextDate) {
                    await tx
                        .update(RecurrenceRulesSchema)
                        .set({ state: 'ended', editedAt: new Date() })
                        .where(eq(RecurrenceRulesSchema.id, rule.id));
                    return { ended: rule } as const;
                }

                const insertedRows = await tx
                    .insert(TasksSchema)
                    .values(await this.buildInstanceValues({ rule, instanceDate: nextDate, tx }))
                    .onConflictDoNothing()
                    .returning();
                const instance = insertedRows[0];
                // Conflict on (rule_id, instance_date): a concurrent run already materialized it.
                if (!instance) return null;

                const [assignees, tags] = await Promise.all([
                    tx
                        .select({ collabUserId: RecurrenceTemplateAssigneesSchema.collabUserId })
                        .from(RecurrenceTemplateAssigneesSchema)
                        .where(eq(RecurrenceTemplateAssigneesSchema.ruleId, rule.id)),
                    tx
                        .select({ tagId: RecurrenceTemplateTagsSchema.tagId })
                        .from(RecurrenceTemplateTagsSchema)
                        .where(eq(RecurrenceTemplateTagsSchema.ruleId, rule.id)),
                ]);
                if (assignees.length > 0) {
                    await tx
                        .insert(TasksAssigneeSchema)
                        .values(assignees.map((a) => ({ taskId: instance.id, collabUserId: a.collabUserId })))
                        .onConflictDoNothing();
                }
                if (tags.length > 0) {
                    await tx
                        .insert(TasksToTagsSchema)
                        .values(tags.map((t) => ({ taskId: instance.id, tagId: t.tagId })))
                        .onConflictDoNothing();
                }

                await tx
                    .update(RecurrenceRulesSchema)
                    .set({
                        lastInstanceDate: nextDate,
                        instancesCreated: rule.instancesCreated + 1,
                        editedAt: new Date(),
                    })
                    .where(eq(RecurrenceRulesSchema.id, rule.id));

                return { instance, rule } as const;
            })
            .catch((err) => {
                $logger.error(err, `[RecurrenceGenerator] materializeNext failed rule=${args.ruleId}`);
                return null;
            });

        if (!outcome) return null;

        if ('ended' in outcome) {
            eventBus.emit('recurrence.ended', {
                ruleId: outcome.ended.id,
                goalId: outcome.ended.goalId,
                initiatorId: args.initiatorId,
            });
            return null;
        }

        // Standard event so DeadlineScheduler / webhooks / realtime treat the instance as a normal new task.
        eventBus.emit('task.created', { task: outcome.instance, initiatorId: args.initiatorId });
        return outcome.instance;
    }

    private async buildInstanceValues(args: {
        rule: RecurrenceRulesSchemaTypeForSelect;
        instanceDate: string;
        tx: Parameters<Parameters<Database['dbDrizzle']['transaction']>[0]>[0];
    }): Promise<typeof TasksSchema.$inferInsert> {
        const { rule, instanceDate, tx } = args;

        const statusId = await this.resolveStatusId({ rule, tx });
        const goalListId = await this.resolveGoalListId({ rule, tx });
        const kanbanOrder = await this.nextKanbanOrder({ goalId: rule.goalId, tx });

        // Tasks store UTC instants; the series is anchored to wall-clock time in
        // its timezone, so the instant is recomputed per occurrence (DST-aware).
        const window = RecurrenceParser.instanceWindowUtc({
            occurrenceDate: instanceDate,
            dtstart: rule.dtstart,
            hasTime: rule.hasTime,
            timezone: rule.timezone,
            durationMinutes: rule.templateDurationMinutes,
        });

        return {
            goalId: rule.goalId,
            description: rule.templateDescription ?? '',
            note: rule.templateNote,
            complete: false,
            priorityId: rule.templatePriorityId,
            statusId,
            goalListId,
            creatorId: rule.creatorId,
            kanbanOrder,
            startDate: window.startDate,
            startTime: window.startTime,
            endDate: window.endDate,
            endTime: window.endTime,
            recurrenceRuleId: rule.id,
            recurrenceInstanceDate: instanceDate,
        };
    }

    /** Snapshot kanban column if it still exists, otherwise the first column of the goal. */
    private async resolveStatusId(args: {
        rule: RecurrenceRulesSchemaTypeForSelect;
        tx: Parameters<Parameters<Database['dbDrizzle']['transaction']>[0]>[0];
    }): Promise<number | null> {
        if (args.rule.templateStatusId !== null) {
            const rows = await args.tx
                .select({ id: TasksStatusesSchema.id })
                .from(TasksStatusesSchema)
                .where(and(eq(TasksStatusesSchema.id, args.rule.templateStatusId), eq(TasksStatusesSchema.goalId, args.rule.goalId)))
                .limit(1);
            if (rows[0]) return rows[0].id;
        }
        const fallback = await args.tx
            .select({ id: TasksStatusesSchema.id })
            .from(TasksStatusesSchema)
            .where(eq(TasksStatusesSchema.goalId, args.rule.goalId))
            .orderBy(asc(TasksStatusesSchema.id))
            .limit(1);
        return fallback[0]?.id ?? null;
    }

    /** Snapshot list if it still exists, otherwise no list. */
    private async resolveGoalListId(args: {
        rule: RecurrenceRulesSchemaTypeForSelect;
        tx: Parameters<Parameters<Database['dbDrizzle']['transaction']>[0]>[0];
    }): Promise<number | null> {
        if (args.rule.templateGoalListId === null) return null;
        const rows = await args.tx
            .select({ id: GoalsListSchema.id })
            .from(GoalsListSchema)
            .where(and(eq(GoalsListSchema.id, args.rule.templateGoalListId), eq(GoalsListSchema.goalId, args.rule.goalId)))
            .limit(1);
        return rows[0]?.id ?? null;
    }

    /** Same top-of-board convention as manual creation (getNextKanbanOrder), but inside the transaction. */
    private async nextKanbanOrder(args: {
        goalId: number;
        tx: Parameters<Parameters<Database['dbDrizzle']['transaction']>[0]>[0];
    }): Promise<number> {
        const rows = await args.tx
            .select({ minKanbanOrder: sql<number | null>`MIN(${TasksSchema.kanbanOrder})` })
            .from(TasksSchema)
            .where(eq(TasksSchema.goalId, args.goalId));
        return (rows[0]?.minKanbanOrder ?? 0) - TasksRepository.KANBAN_ORDER_GAP;
    }
}
