import { and, asc, desc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import {
    SprintCadenceSchema,
    SprintsSchema,
    SprintTaskOutcomesSchema,
    SprintUserCapacitySchema,
    SprintRetrosSchema,
    TasksSchema,
    type SprintCadenceSchemaTypeForSelect,
    type SprintStatus,
    type SprintsSchemaTypeForInsert,
    type SprintsSchemaTypeForSelect,
    type TasksSchemaTypeForSelect,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';
import type {
    SprintCadenceFindByStartArgs,
    SprintCadenceSprintCreateArgs,
    SprintCadenceTouchArgs,
    SprintCadenceUpsertRepoArgs,
    SprintCloseManagerArgs,
    SprintCreateRepoArgs,
    SprintListFilter,
    SprintPlanningPageArgs,
    SprintSaveRetroManagerArgs,
    VelocityPoint,
} from './types';

export class SprintsRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async create(args: SprintCreateRepoArgs, status: SprintStatus): Promise<SprintsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(SprintsSchema)
                .values({
                    goalId: args.goalId,
                    name: args.name,
                    startDate: args.startDate,
                    endDate: args.endDate,
                    goalText: args.goalText ?? null,
                    capacity: args.capacity != null ? String(args.capacity) : null,
                    status,
                    creatorId: args.creatorId,
                })
                .returning()
        );
        return result?.[0] ?? null;
    }

    async getById(sprintId: number): Promise<SprintsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(SprintsSchema).where(eq(SprintsSchema.id, sprintId)).limit(1)
        );
        return result?.[0] ?? null;
    }

    /** Cadence: per-project auto-generation config (Linear-style). */
    async getCadence(goalId: number): Promise<SprintCadenceSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(SprintCadenceSchema).where(eq(SprintCadenceSchema.goalId, goalId)).limit(1)
        );
        return result?.[0] ?? null;
    }

    async upsertCadence(args: SprintCadenceUpsertRepoArgs): Promise<SprintCadenceSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(SprintCadenceSchema)
                .values({
                    goalId: args.goalId,
                    enabled: args.enabled,
                    lengthDays: args.lengthDays,
                    startDate: args.startDate,
                    lookahead: args.lookahead,
                    nameTemplate: args.nameTemplate,
                })
                .onConflictDoUpdate({
                    target: SprintCadenceSchema.goalId,
                    set: {
                        enabled: args.enabled,
                        lengthDays: args.lengthDays,
                        startDate: args.startDate,
                        lookahead: args.lookahead,
                        nameTemplate: args.nameTemplate,
                        editedAt: new Date(),
                    },
                })
                .returning()
        );
        return result?.[0] ?? null;
    }

    async getEnabledCadences(): Promise<SprintCadenceSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(SprintCadenceSchema).where(eq(SprintCadenceSchema.enabled, true))
        );
        return result ?? [];
    }

    async findByGoalAndStartDate(args: SprintCadenceFindByStartArgs): Promise<SprintsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(SprintsSchema)
                .where(
                    and(
                        eq(SprintsSchema.goalId, args.goalId),
                        eq(SprintsSchema.startDate, args.startDate),
                        ne(SprintsSchema.status, 'completed')
                    )
                )
                .limit(1)
        );
        return result?.[0] ?? null;
    }

    async setCadenceLastGenerated(args: SprintCadenceTouchArgs): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle
                .update(SprintCadenceSchema)
                .set({ lastGeneratedDate: args.lastGeneratedDate, editedAt: new Date() })
                .where(eq(SprintCadenceSchema.goalId, args.goalId))
        );
    }

    /** Create an auto-generated (cadence) sprint — no creator, always starts planned. */
    async createCadenceSprint(args: SprintCadenceSprintCreateArgs): Promise<SprintsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(SprintsSchema)
                .values({
                    goalId: args.goalId,
                    name: args.name,
                    startDate: args.startDate,
                    endDate: args.endDate,
                    status: 'planned',
                    creatorId: null,
                })
                .returning()
        );
        return result?.[0] ?? null;
    }

    async listForGoal(filter: SprintListFilter): Promise<SprintsSchemaTypeForSelect[]> {
        const conditions = [eq(SprintsSchema.goalId, filter.goalId)];
        if (filter.statuses && filter.statuses.length > 0) {
            conditions.push(inArray(SprintsSchema.status, filter.statuses));
        }
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(SprintsSchema)
                .where(and(...conditions))
                .orderBy(desc(SprintsSchema.startDate))
        );
        return result ?? [];
    }

    /** The single active OR in-review sprint of a goal, if any. */
    async findActiveOrReview(goalId: number, excludeSprintId?: number): Promise<SprintsSchemaTypeForSelect | null> {
        const conditions = [
            eq(SprintsSchema.goalId, goalId),
            inArray(SprintsSchema.status, ['active', 'review'] as SprintStatus[]),
        ];
        if (excludeSprintId) {
            conditions.push(ne(SprintsSchema.id, excludeSprintId));
        }
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(SprintsSchema)
                .where(and(...conditions))
                .limit(1)
        );
        return result?.[0] ?? null;
    }

    async patch(args: {
        sprintId: number;
        patch: Partial<SprintsSchemaTypeForInsert>;
    }): Promise<SprintsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(SprintsSchema)
                .set({ ...args.patch, editedAt: new Date() })
                .where(eq(SprintsSchema.id, args.sprintId))
                .returning()
        );
        return result?.[0] ?? null;
    }

    async delete(sprintId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(SprintsSchema).where(eq(SprintsSchema.id, sprintId)).returning()
        );
        return !!result?.length;
    }

    async getTaskMeta(taskId: number): Promise<{ goalId: number; sprintId: number | null } | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ goalId: TasksSchema.goalId, sprintId: TasksSchema.sprintId })
                .from(TasksSchema)
                .where(eq(TasksSchema.id, taskId))
                .limit(1)
        );
        return result?.[0] ?? null;
    }

    async setTaskSprint(args: { taskId: number; sprintId: number | null }): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TasksSchema)
                .set({ sprintId: args.sprintId })
                .where(eq(TasksSchema.id, args.taskId))
                .returning()
        );
        return !!result?.length;
    }

    /** Estimate rows of all tasks currently in the sprint — input for burndown. */
    async getSprintTaskEstimates(
        sprintId: number
    ): Promise<{ estimateValue: string | null; complete: boolean | null; dateComplete: Date | null }[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    estimateValue: TasksSchema.estimateValue,
                    complete: TasksSchema.complete,
                    // trigger-maintained completion moment (tasks.update_date_complete)
                    dateComplete: TasksSchema.dateComplete,
                })
                .from(TasksSchema)
                .where(eq(TasksSchema.sprintId, sprintId))
        );
        return result ?? [];
    }

    async getOutcomes(sprintId: number) {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(SprintTaskOutcomesSchema)
                .where(eq(SprintTaskOutcomesSchema.sprintId, sprintId))
        );
        return result ?? [];
    }

    async getUserCapacities(sprintId: number) {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(SprintUserCapacitySchema)
                .where(eq(SprintUserCapacitySchema.sprintId, sprintId))
        );
        return result ?? [];
    }

    async getRetro(sprintId: number) {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(SprintRetrosSchema)
                .where(eq(SprintRetrosSchema.sprintId, sprintId))
                .limit(1)
        );
        return result?.[0] ?? null;
    }

    async saveRetro(args: SprintSaveRetroManagerArgs) {
        const set = {
            wentWell: args.wentWell ?? null,
            wentBad: args.wentBad ?? null,
            actionItems: args.actionItems ?? null,
            editedBy: args.editedBy,
            editedAt: new Date(),
        };
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(SprintRetrosSchema)
                .values({ sprintId: args.sprintId, ...set })
                .onConflictDoUpdate({ target: SprintRetrosSchema.sprintId, set })
                .returning()
        );
        return result?.[0] ?? null;
    }

    /**
     * Close transaction: set sprint completed, record per-task outcomes
     * (untouched tasks -> 'incomplete'), apply task sprint moves.
     */
    async applyClose(args: SprintCloseManagerArgs): Promise<SprintsSchemaTypeForSelect | null> {
        return this.db.dbDrizzle.transaction(async (tx) => {
            const updated = await tx
                .update(SprintsSchema)
                .set({
                    status: 'completed',
                    completedAt: new Date(),
                    goalAchieved: args.goalAchieved,
                    editedAt: new Date(),
                })
                .where(eq(SprintsSchema.id, args.sprintId))
                .returning();

            const tasks = await tx
                .select({ id: TasksSchema.id, complete: TasksSchema.complete, estimateValue: TasksSchema.estimateValue })
                .from(TasksSchema)
                .where(eq(TasksSchema.sprintId, args.sprintId));

            const explicit = new Map(args.outcomes.map((o) => [o.taskId, o]));

            // Resolve a final outcome per task, ENFORCING the invariant:
            // a completed task is always 'accepted' (and stays in the sprint);
            // an unfinished task can only be 'carried-over' or 'dropped' (anything
            // else falls back to 'incomplete'). This keeps velocity consistent
            // regardless of what the client sent — you can't carry over / drop
            // already-done work, nor accept unfinished work.
            const resolved = tasks.map((t) => {
                // Snapshot the task's estimate at close — frozen, independent of later edits.
                const estimateValue = t.estimateValue;
                if (t.complete) {
                    return { taskId: t.id, outcome: 'accepted' as const, carriedOverTo: null as number | null, estimateValue };
                }
                const decided = explicit.get(t.id);
                if (decided?.outcome === 'carried-over') {
                    return { taskId: t.id, outcome: 'carried-over' as const, carriedOverTo: decided.carriedOverTo ?? null, estimateValue };
                }
                if (decided?.outcome === 'dropped') {
                    return { taskId: t.id, outcome: 'dropped' as const, carriedOverTo: null as number | null, estimateValue };
                }
                return { taskId: t.id, outcome: 'incomplete' as const, carriedOverTo: null as number | null, estimateValue };
            });

            if (resolved.length > 0) {
                await tx
                    .insert(SprintTaskOutcomesSchema)
                    .values(
                        resolved.map((r) => ({
                            sprintId: args.sprintId,
                            taskId: r.taskId,
                            outcome: r.outcome,
                            carriedOverTo: r.carriedOverTo,
                            decidedBy: args.initiatorId,
                            estimateValue: r.estimateValue,
                        }))
                    )
                    .onConflictDoNothing();
            }

            // Move only unfinished tasks out of the sprint; completed ('accepted')
            // and untouched ('incomplete') tasks stay in the closed sprint.
            for (const r of resolved) {
                if (r.outcome === 'carried-over') {
                    await tx
                        .update(TasksSchema)
                        .set({ sprintId: r.carriedOverTo })
                        .where(eq(TasksSchema.id, r.taskId));
                } else if (r.outcome === 'dropped') {
                    await tx.update(TasksSchema).set({ sprintId: null }).where(eq(TasksSchema.id, r.taskId));
                }
            }

            return updated[0] ?? null;
        });
    }

    async velocity(args: { goalId: number; lastN: number }): Promise<VelocityPoint[]> {
        const sprints = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: SprintsSchema.id, name: SprintsSchema.name })
                .from(SprintsSchema)
                .where(and(eq(SprintsSchema.goalId, args.goalId), eq(SprintsSchema.status, 'completed' as SprintStatus)))
                .orderBy(desc(SprintsSchema.completedAt))
                .limit(args.lastN)
        );
        if (!sprints || sprints.length === 0) return [];

        const points: VelocityPoint[] = [];
        for (const s of sprints) {
            const rows = await callWithCatch(() =>
                this.db.dbDrizzle
                    // Read the FROZEN snapshot, not the live task estimate.
                    .select({ outcome: SprintTaskOutcomesSchema.outcome, estimate: SprintTaskOutcomesSchema.estimateValue })
                    .from(SprintTaskOutcomesSchema)
                    .where(eq(SprintTaskOutcomesSchema.sprintId, s.id))
            );
            let accepted = 0;
            let planned = 0;
            (rows ?? []).forEach((r) => {
                const est = r.estimate ? Number(r.estimate) : 0;
                planned += est;
                if (r.outcome === 'accepted') accepted += est;
            });
            points.push({ sprintId: s.id, name: s.name, acceptedHours: accepted, plannedHours: planned });
        }
        return points.reverse();
    }

    /**
     * Backlog tasks for sprint planning: top-level, incomplete, not yet in any sprint.
     * Cursor-paginated by ascending task id; returns up to `limit + 1` rows so the caller
     * can detect a next page.
     */
    async getBacklogTasksForPlanning(args: SprintPlanningPageArgs & { goalId: number }): Promise<TasksSchemaTypeForSelect[]> {
        const conditions = [
            eq(TasksSchema.goalId, args.goalId),
            isNull(TasksSchema.sprintId),
            or(eq(TasksSchema.complete, false), isNull(TasksSchema.complete)),
            isNull(TasksSchema.parentId),
        ];
        if (args.cursor != null) {
            conditions.push(gt(TasksSchema.id, args.cursor));
        }
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TasksSchema)
                .where(and(...conditions))
                .orderBy(asc(TasksSchema.id))
                .limit(args.limit + 1)
        );
        return result ?? [];
    }

    /**
     * Tasks currently in the sprint for planning: top-level tasks of the sprint
     * (completed included — they belong to the sprint). Cursor-paginated by ascending id.
     */
    async getSprintTasksForPlanning(args: SprintPlanningPageArgs): Promise<TasksSchemaTypeForSelect[]> {
        const conditions = [eq(TasksSchema.sprintId, args.sprintId), isNull(TasksSchema.parentId)];
        if (args.cursor != null) {
            conditions.push(gt(TasksSchema.id, args.cursor));
        }
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TasksSchema)
                .where(and(...conditions))
                .orderBy(asc(TasksSchema.id))
                .limit(args.limit + 1)
        );
        return result ?? [];
    }

    /** SUM(estimate_value) over ALL top-level tasks in the sprint — for the capacity counter. */
    async sumEstimateForSprint(sprintId: number): Promise<number> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ total: sql<string | null>`COALESCE(SUM(${TasksSchema.estimateValue}), 0)` })
                .from(TasksSchema)
                .where(and(eq(TasksSchema.sprintId, sprintId), isNull(TasksSchema.parentId)))
        );
        return result?.[0]?.total ? Number(result[0].total) : 0;
    }

    /** Active sprint id of a goal — for the kanban `sprint=current` filter. */
    async getActiveSprintId(goalId: number): Promise<number | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: SprintsSchema.id })
                .from(SprintsSchema)
                .where(and(eq(SprintsSchema.goalId, goalId), eq(SprintsSchema.status, 'active' as SprintStatus)))
                .limit(1)
        );
        return result?.[0]?.id ?? null;
    }
}
