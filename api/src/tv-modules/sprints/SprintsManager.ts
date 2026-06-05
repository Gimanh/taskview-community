import type {
    SprintCadenceSchemaTypeForSelect,
    SprintsSchemaTypeForInsert,
    SprintsSchemaTypeForSelect,
    SprintStatus,
    TasksSchemaTypeForSelect,
} from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { eventBus } from '../../core/EventBus';
import { $logger } from '../../modules/logget';
import { SprintScheduler } from './SprintScheduler';
import { SprintsRepository } from './SprintsRepository';
import type {
    BurndownPoint,
    SprintCloseArgs,
    SprintCreateArgs,
    SprintErrorCode,
    SprintListFilter,
    SprintPlanningManagerArgs,
    SprintPlanningPage,
    SprintResult,
    SprintSaveRetroArgs,
    SprintSetCadenceArgs,
    SprintSetTaskArgs,
    SprintUpdateArgs,
    SprintVelocityArgs,
} from './types';

const ok = <T>(data: T): SprintResult<T> => ({ ok: true, data });
const fail = (code: SprintErrorCode, message?: string): SprintResult<never> => ({ ok: false, code, message });

export class SprintsManager {
    private readonly user: AppUser;
    public readonly repository: SprintsRepository;
    private readonly scheduler: SprintScheduler;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new SprintsRepository();
        this.scheduler = new SprintScheduler();
    }

    private get initiatorId(): number {
        return this.user.getUserData()?.id as number;
    }

    private today(): string {
        return new Date().toISOString().slice(0, 10);
    }

    async listSprints(filter: SprintListFilter): Promise<SprintsSchemaTypeForSelect[]> {
        return this.repository.listForGoal(filter);
    }

    async getSprint(sprintId: number) {
        const sprint = await this.repository.getById(sprintId);
        if (!sprint) return null;
        const retro = await this.repository.getRetro(sprintId);
        return {
            ...sprint,
            retro: retro
                ? { wentWell: retro.wentWell, wentBad: retro.wentBad, actionItems: retro.actionItems }
                : null,
        };
    }

    async createSprint(args: SprintCreateArgs): Promise<SprintResult<SprintsSchemaTypeForSelect>> {
        if (args.endDate < args.startDate) return fail('invalid_state', 'endDate must be >= startDate');
        const status: SprintStatus = args.startDate > this.today() ? 'planned' : 'draft';
        const sprint = await this.repository.create({ ...args, creatorId: this.initiatorId }, status);
        if (!sprint) return fail('invalid_state', 'could not create sprint');
        eventBus.emit('sprint.created', { sprint, initiatorId: this.initiatorId });
        return ok(sprint);
    }

    async updateSprint(args: SprintUpdateArgs): Promise<SprintResult<SprintsSchemaTypeForSelect>> {
        const sprint = await this.repository.getById(args.sprintId);
        if (!sprint) return fail('not_found');
        if (sprint.status === 'completed') return fail('invalid_state', 'completed sprints are read-only');

        const patch: Partial<SprintsSchemaTypeForInsert> = {};
        if (args.name !== undefined) patch.name = args.name;
        if (args.startDate !== undefined) patch.startDate = args.startDate;
        if (args.endDate !== undefined) patch.endDate = args.endDate;
        if (args.goalText !== undefined) patch.goalText = args.goalText;
        if (args.capacity !== undefined) {
            patch.capacity = args.capacity != null ? String(args.capacity) : null;
        }

        const newStart = args.startDate ?? sprint.startDate;
        const newEnd = args.endDate ?? sprint.endDate;
        if (newEnd < newStart) return fail('invalid_state', 'endDate must be >= startDate');

        const updated = await this.repository.patch({ sprintId: args.sprintId, patch });
        if (!updated) return fail('invalid_state');

        eventBus.emit('sprint.updated', { sprint: updated, changes: patch, initiatorId: this.initiatorId });
        return ok(updated);
    }

    async activateSprint(sprintId: number): Promise<SprintResult<SprintsSchemaTypeForSelect>> {
        const sprint = await this.repository.getById(sprintId);
        if (!sprint) return fail('not_found');
        if (sprint.status !== 'draft' && sprint.status !== 'planned') {
            return fail('invalid_state', 'only draft or planned sprints can be activated');
        }
        const conflict = await this.repository.findActiveOrReview(sprint.goalId, sprint.id);
        if (conflict) return fail('conflict', 'another sprint is already active or in review');

        const updated = await this.repository.patch({ sprintId, patch: { status: 'active' } });
        if (!updated) return fail('invalid_state');
        eventBus.emit('sprint.activated', { sprintId, goalId: sprint.goalId, initiatorId: this.initiatorId });
        return ok(updated);
    }

    async startReview(sprintId: number): Promise<SprintResult<SprintsSchemaTypeForSelect>> {
        const sprint = await this.repository.getById(sprintId);
        if (!sprint) return fail('not_found');
        if (sprint.status !== 'active') return fail('invalid_state', 'only an active sprint can enter review');

        const updated = await this.repository.patch({
            sprintId,
            patch: { status: 'review', reviewStartedAt: new Date() },
        });
        if (!updated) return fail('invalid_state');
        eventBus.emit('sprint.reviewStarted', { sprintId, goalId: sprint.goalId, initiatorId: this.initiatorId });
        return ok(updated);
    }

    async closeSprint(args: SprintCloseArgs): Promise<SprintResult<SprintsSchemaTypeForSelect>> {
        const sprint = await this.repository.getById(args.sprintId);
        if (!sprint) return fail('not_found');
        if (sprint.status !== 'review') return fail('invalid_state', 'sprint must be in review before closing');

        for (const o of args.outcomes) {
            if (o.outcome === 'carried-over' && o.carriedOverTo != null) {
                if (o.carriedOverTo === sprint.id) return fail('invalid_state', 'cannot carry over to the same sprint');
                const target = await this.repository.getById(o.carriedOverTo);
                if (!target || target.goalId !== sprint.goalId) {
                    return fail('invalid_state', 'carry-over target sprint not found in this project');
                }
            }
        }

        const closed = await this.repository.applyClose({ ...args, initiatorId: this.initiatorId });
        if (!closed) return fail('invalid_state');
        eventBus.emit('sprint.completed', { sprintId: args.sprintId, goalId: sprint.goalId, initiatorId: this.initiatorId });
        return ok(closed);
    }

    async pauseSprint(sprintId: number): Promise<SprintResult<SprintsSchemaTypeForSelect>> {
        const sprint = await this.repository.getById(sprintId);
        if (!sprint) return fail('not_found');
        if (sprint.status !== 'active') return fail('invalid_state', 'only an active sprint can be paused');
        if (sprint.pausedAt) return fail('invalid_state', 'sprint is already paused');
        const updated = await this.repository.patch({ sprintId, patch: { pausedAt: new Date() } });
        if (!updated) return fail('invalid_state');
        eventBus.emit('sprint.paused', { sprintId, goalId: sprint.goalId, initiatorId: this.initiatorId });
        return ok(updated);
    }

    async resumeSprint(sprintId: number): Promise<SprintResult<SprintsSchemaTypeForSelect>> {
        const sprint = await this.repository.getById(sprintId);
        if (!sprint) return fail('not_found');
        if (sprint.status !== 'active' || !sprint.pausedAt) return fail('invalid_state', 'sprint is not paused');
        const updated = await this.repository.patch({ sprintId, patch: { pausedAt: null } });
        if (!updated) return fail('invalid_state');
        eventBus.emit('sprint.resumed', { sprintId, goalId: sprint.goalId, initiatorId: this.initiatorId });
        return ok(updated);
    }

    async deleteSprint(sprintId: number): Promise<SprintResult<true>> {
        const sprint = await this.repository.getById(sprintId);
        if (!sprint) return fail('not_found');
        // A sprint of any status can be deleted (including completed) — useful for
        // cleaning up an accidentally closed sprint. The DB FK sets tasks.sprint_id
        // to NULL (tasks return to the backlog) and cascades outcomes/retros/capacity.
        const deleted = await this.repository.delete(sprintId);
        if (!deleted) return fail('invalid_state');
        eventBus.emit('sprint.deleted', { sprintId, goalId: sprint.goalId, initiatorId: this.initiatorId });
        return ok(true);
    }

    async saveRetro(args: SprintSaveRetroArgs): Promise<SprintResult<SprintSaveRetroArgs>> {
        const sprint = await this.repository.getById(args.sprintId);
        if (!sprint) return fail('not_found');
        const saved = await this.repository.saveRetro({ ...args, editedBy: this.initiatorId });
        if (!saved) return fail('invalid_state');
        return ok(args);
    }

    async setTaskSprint(args: SprintSetTaskArgs): Promise<SprintResult<{ taskId: number; sprintId: number | null }>> {
        const taskMeta = await this.repository.getTaskMeta(args.taskId);
        if (!taskMeta) return fail('not_found', 'task not found');

        if (args.sprintId !== null) {
            const sprint = await this.repository.getById(args.sprintId);
            if (!sprint) return fail('not_found', 'sprint not found');
            if (sprint.goalId !== taskMeta.goalId) {
                return fail('forbidden', 'task and sprint belong to different projects');
            }
            if (sprint.status === 'completed') {
                return fail('invalid_state', 'cannot move tasks into a completed sprint');
            }
        }

        const prevSprintId = taskMeta.sprintId;
        const done = await this.repository.setTaskSprint(args);
        if (!done) return fail('invalid_state');
        eventBus.emit('task.assignedToSprint', {
            taskId: args.taskId,
            sprintId: args.sprintId,
            prevSprintId,
            goalId: taskMeta.goalId,
            initiatorId: this.initiatorId,
        });
        return ok({ taskId: args.taskId, sprintId: args.sprintId });
    }

    async getBurndown(sprintId: number): Promise<{ total: number; points: BurndownPoint[] } | null> {
        const sprint = await this.repository.getById(sprintId);
        if (!sprint) return null;
        const tasks = await this.repository.getSprintTaskEstimates(sprintId);
        const total = tasks.reduce((sum, t) => sum + (t.estimateValue ? Number(t.estimateValue) : 0), 0);

        const days = this.enumerateDays(sprint.startDate, sprint.endDate);
        const n = days.length;
        const points: BurndownPoint[] = days.map((date, i) => {
            const dayEnd = new Date(`${date}T23:59:59.999Z`);
            let remaining = 0;
            for (const t of tasks) {
                const est = t.estimateValue ? Number(t.estimateValue) : 0;
                const isRemaining = t.complete !== true || (t.dateComplete != null && t.dateComplete > dayEnd);
                if (isRemaining) remaining += est;
            }
            const ideal = n > 1 ? total * (1 - i / (n - 1)) : 0;
            return {
                date,
                remainingHours: Math.round(remaining * 100) / 100,
                idealHours: Math.max(0, Math.round(ideal * 100) / 100),
            };
        });
        return { total: Math.round(total * 100) / 100, points };
    }

    async getVelocity(args: SprintVelocityArgs) {
        return this.repository.velocity({ goalId: args.goalId, lastN: args.lastN || 6 });
    }

    async getCadence(goalId: number): Promise<SprintCadenceSchemaTypeForSelect | null> {
        return this.repository.getCadence(goalId);
    }

    async setCadence(args: SprintSetCadenceArgs): Promise<SprintResult<SprintCadenceSchemaTypeForSelect>> {
        const existing = await this.repository.getCadence(args.goalId);

        const lengthDays = args.lengthDays ?? existing?.lengthDays ?? 14;
        const lookahead = args.lookahead ?? existing?.lookahead ?? 2;
        if (lengthDays < 1 || lengthDays > 90) return fail('invalid_state', 'lengthDays must be 1..90');
        if (lookahead < 0 || lookahead > 12) return fail('invalid_state', 'lookahead must be 0..12');

        const startDate = args.startDate ?? existing?.startDate ?? this.today();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return fail('invalid_state', 'startDate must be YYYY-MM-DD');

        const nameTemplate = args.nameTemplate?.trim() || existing?.nameTemplate || 'Sprint {n}';

        const saved = await this.repository.upsertCadence({
            goalId: args.goalId,
            enabled: args.enabled,
            lengthDays,
            startDate,
            lookahead,
            nameTemplate,
        });
        if (!saved) return fail('invalid_state', 'could not save cadence');

        if (saved.enabled) {
            await this.scheduler
                .generateCadenceForGoal(args.goalId)
                .catch((e) => $logger.error(e, '[Sprints] cadence generate'));
        }
        return ok(saved);
    }

    async getPlanningTasks(args: SprintPlanningManagerArgs): Promise<SprintPlanningPage | null> {
        const sprint = await this.repository.getById(args.sprintId);
        if (!sprint) return null;

        if (args.scope === 'sprint') {
            const rows = await this.repository.getSprintTasksForPlanning({
                sprintId: args.sprintId,
                cursor: args.cursor,
                limit: args.limit,
            });
            const { tasks, nextCursor } = this.paginate(rows, args.limit);
            const totalPoints = await this.repository.sumEstimateForSprint(args.sprintId);
            return { tasks, nextCursor, totalPoints };
        }

        const rows = await this.repository.getBacklogTasksForPlanning({
            goalId: sprint.goalId,
            sprintId: args.sprintId,
            cursor: args.cursor,
            limit: args.limit,
        });
        return this.paginate(rows, args.limit);
    }

    private paginate(
        rows: TasksSchemaTypeForSelect[],
        limit: number
    ): { tasks: TasksSchemaTypeForSelect[]; nextCursor: number | null } {
        const hasMore = rows.length > limit;
        const tasks = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore ? tasks[tasks.length - 1].id : null;
        return { tasks, nextCursor };
    }

    private enumerateDays(start: string, end: string): string[] {
        const days: string[] = [];
        const cur = new Date(`${start}T00:00:00Z`);
        const last = new Date(`${end}T00:00:00Z`);
        // hard cap to avoid pathological ranges
        let guard = 0;
        while (cur <= last && guard < 400) {
            days.push(cur.toISOString().slice(0, 10));
            cur.setUTCDate(cur.getUTCDate() + 1);
            guard++;
        }
        return days;
    }
}
