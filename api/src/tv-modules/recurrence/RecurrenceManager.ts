import type { RecurrenceRulesSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { eventBus } from '../../core/EventBus';
import { KanbanRepository } from '../kanban/KanbanRepository';
import { GoalListsRepository } from '../lists/GoalListsRepository';
import { TaskFieldPermissionsForWatching } from '../tasks/tasks.server.types';
import { TasksRepository } from '../tasks/TasksRepository';
import { RecurrenceGenerator } from './RecurrenceGenerator';
import { RecurrenceParser } from './RecurrenceParser';
import { RecurrenceRepository } from './RecurrenceRepository';
import type {
    RecurrenceCreateArgs,
    RecurrenceErrorCode,
    RecurrenceResult,
    RecurrenceRuleDetails,
    RecurrenceUpdateArgs,
} from './types';

const ok = <T>(data: T): RecurrenceResult<T> => ({ ok: true, data });
const fail = (code: RecurrenceErrorCode, message?: string): RecurrenceResult<never> => ({ ok: false, code, message });

// Template fields mirror task fields, so the task-field permission map stays
// the single source of truth for which permission gates which field.
const RuleTemplateFieldPermissionsForWatching = {
    templateDescription: TaskFieldPermissionsForWatching.description,
    templateNote: TaskFieldPermissionsForWatching.note,
    templatePriorityId: TaskFieldPermissionsForWatching.priorityId,
    templateStatusId: TaskFieldPermissionsForWatching.statusId,
    templateGoalListId: TaskFieldPermissionsForWatching.goalListId,
} as const;

export class RecurrenceManager {
    private readonly user: AppUser;
    public readonly repository: RecurrenceRepository;
    private readonly generator: RecurrenceGenerator;
    private readonly tasksRepository: TasksRepository;
    private readonly kanbanRepository: KanbanRepository;
    private readonly goalListsRepository: GoalListsRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new RecurrenceRepository();
        this.generator = new RecurrenceGenerator();
        this.tasksRepository = new TasksRepository();
        this.kanbanRepository = new KanbanRepository();
        this.goalListsRepository = new GoalListsRepository();
    }

    private get initiatorId(): number {
        return this.user.getUserData()?.id as number;
    }

    async createRule(args: RecurrenceCreateArgs): Promise<RecurrenceResult<RecurrenceRulesSchemaTypeForSelect>> {
        const task = await this.repository.getTaskById(args.taskId);
        if (!task) return fail('not_found', 'task not found');
        if (task.recurrenceRuleId) return fail('conflict', 'task is already part of a series');
        if (task.parentId) return fail('invalid_state', 'subtasks can not be recurring');
        if (task.complete) return fail('invalid_state', 'completed tasks can not start a series');

        if (!RecurrenceParser.isValidTimezone(args.timezone)) {
            return fail('invalid_rule', 'timezone must be a valid IANA name');
        }

        let dtstart: Date;
        let hasTime: boolean;
        try {
            RecurrenceParser.validateRuleString(args.rrule);
            ({ date: dtstart, hasTime } = RecurrenceParser.parseDtstart(args.dtstart));
        } catch (err) {
            return fail('invalid_rule', (err as Error).message);
        }

        const originInstanceDate = RecurrenceParser.firstOccurrenceDate({ rrule: args.rrule, dtstart });
        if (!originInstanceDate) return fail('invalid_rule', 'rule produces no occurrences');

        const templateDurationMinutes = this.durationFromTask({
            startDate: task.startDate ?? originInstanceDate,
            startTime: task.startTime,
            endDate: task.endDate,
            endTime: task.endTime,
        });

        // One transaction: rule + origin attachment + snapshot. The origin task
        // becomes the first (and only open) instance of the series, its window
        // normalized into the same UTC frame future instances will use —
        // otherwise a series created through a non-browser client (MCP, raw API)
        // could leave the origin and its successors in different time frames.
        const outcome = await this.repository.createWithOriginTask({
            rule: {
                goalId: task.goalId,
                templateTaskId: task.id,
                templateDescription: task.description ?? '',
                templateNote: task.note,
                templatePriorityId: task.priorityId,
                templateStatusId: task.statusId,
                templateGoalListId: task.goalListId,
                templateDurationMinutes,
                rrule: args.rrule,
                dtstart,
                hasTime,
                timezone: args.timezone,
                lastInstanceDate: originInstanceDate,
                notifyOnOccurrence: args.notifyOnOccurrence ?? false,
                creatorId: this.initiatorId,
            },
            originTaskId: task.id,
            originInstanceDate,
            window: RecurrenceParser.instanceWindowUtc({
                occurrenceDate: originInstanceDate,
                dtstart,
                hasTime,
                timezone: args.timezone,
                durationMinutes: templateDurationMinutes,
            }),
        });
        if ('error' in outcome) {
            if (outcome.error === 'not_found') return fail('not_found', 'task not found');
            if (outcome.error === 'conflict') return fail('conflict', 'task is already part of a series');
            return fail('invalid_state', 'could not create rule');
        }

        eventBus.emit('recurrence.created', { rule: outcome.rule, initiatorId: this.initiatorId });
        return ok(await this.cleanRuleFieldsRegardPermissions(outcome.rule));
    }

    /**
     * Task fields are permission-gated for reading (TaskFieldPermissionsForWatching,
     * applied by cleanTaskFieldsRegardPermissions in the task API) — no series
     * endpoint may become a side door to them, so every response carrying a rule
     * strips the template fields the caller is not allowed to watch.
     */
    private async cleanRuleFieldsRegardPermissions(rule: RecurrenceRulesSchemaTypeForSelect): Promise<RecurrenceRulesSchemaTypeForSelect> {
        const checker = await this.user.permissionsFetcher.getCheckerForGoal(rule.goalId).catch(() => null);
        const cleaned = { ...rule };
        (Object.keys(RuleTemplateFieldPermissionsForWatching) as (keyof typeof RuleTemplateFieldPermissionsForWatching)[]).forEach((field) => {
            if (!checker?.hasPermissions(RuleTemplateFieldPermissionsForWatching[field])) {
                cleaned[field] = null;
            }
        });
        return cleaned;
    }

    async getDetails(ruleId: number): Promise<RecurrenceResult<RecurrenceRuleDetails>> {
        const rule = await this.repository.getById(ruleId);
        if (!rule) return fail('not_found');
        const [skipDates, openInstance] = await Promise.all([
            this.repository.getSkipDates(ruleId),
            this.repository.findOpenInstance(ruleId),
        ]);

        // The open instance is an ordinary task — gate its fields exactly like
        // the task API does. Fail closed: better no instance than a leak.
        const cleanedInstance = openInstance
            ? await this.user.tasksManager.cleanTaskFieldsRegardPermissions(openInstance).catch(() => null)
            : null;

        return ok({
            rule: await this.cleanRuleFieldsRegardPermissions(rule),
            skipDates,
            openInstance: cleanedInstance,
        });
    }

    async getDetailsForTask(taskId: number): Promise<RecurrenceResult<RecurrenceRuleDetails>> {
        const rule = await this.repository.getByTaskId(taskId);
        if (!rule) return fail('not_found');
        return this.getDetails(rule.id);
    }

    async updateRule(args: RecurrenceUpdateArgs): Promise<RecurrenceResult<RecurrenceRulesSchemaTypeForSelect>> {
        const rule = await this.repository.getById(args.ruleId);
        if (!rule) return fail('not_found');
        if (rule.state === 'ended') return fail('invalid_state', 'ended series are read-only');

        const patch: Parameters<RecurrenceRepository['patch']>[0]['patch'] = {};
        if (args.rrule !== undefined) {
            try {
                RecurrenceParser.validateRuleString(args.rrule);
            } catch (err) {
                return fail('invalid_rule', (err as Error).message);
            }
            patch.rrule = args.rrule;
        }
        if (args.dtstart !== undefined) {
            try {
                const parsed = RecurrenceParser.parseDtstart(args.dtstart);
                patch.dtstart = parsed.date;
                patch.hasTime = parsed.hasTime;
            } catch (err) {
                return fail('invalid_rule', (err as Error).message);
            }
        }
        if (args.timezone !== undefined) {
            if (!RecurrenceParser.isValidTimezone(args.timezone)) {
                return fail('invalid_rule', 'timezone must be a valid IANA name');
            }
            patch.timezone = args.timezone;
        }
        if (patch.rrule !== undefined || patch.dtstart !== undefined) {
            const nextDate = RecurrenceParser.nextOccurrenceDate({
                rrule: patch.rrule ?? rule.rrule,
                dtstart: patch.dtstart ?? rule.dtstart,
                afterDate: RecurrenceParser.todayInTimezone(patch.timezone ?? rule.timezone),
                skipDates: new Set<string>(),
            });
            if (!nextDate) return fail('invalid_rule', 'rule produces no occurrences');
        }
        if (args.notifyOnOccurrence !== undefined) patch.notifyOnOccurrence = args.notifyOnOccurrence;
        if (args.templateOverrides) {
            const o = args.templateOverrides;
            // Foreign/dead ids must fail here, not get stored and silently
            // fall back at materialization time (null clears the override).
            if (o.statusId !== undefined && o.statusId !== null) {
                const belongs = await this.kanbanRepository.statusBelongsToGoal({ statusId: o.statusId, goalId: rule.goalId });
                if (!belongs) return fail('invalid_rule', 'status does not belong to the goal');
            }
            if (o.goalListId !== undefined && o.goalListId !== null) {
                const belongs = await this.goalListsRepository.listBelongsToGoal({ listId: o.goalListId, goalId: rule.goalId });
                if (!belongs) return fail('invalid_rule', 'list does not belong to the goal');
            }
            if (o.description !== undefined) patch.templateDescription = o.description;
            if (o.note !== undefined) patch.templateNote = o.note;
            if (o.priorityId !== undefined) patch.templatePriorityId = o.priorityId;
            if (o.statusId !== undefined) patch.templateStatusId = o.statusId;
            if (o.goalListId !== undefined) patch.templateGoalListId = o.goalListId;
            if (o.durationMinutes !== undefined) patch.templateDurationMinutes = o.durationMinutes;
        }
        if (Object.keys(patch).length === 0) return ok(await this.cleanRuleFieldsRegardPermissions(rule));

        const updated = await this.repository.patch({ ruleId: args.ruleId, patch });
        if (!updated) return fail('invalid_state');

        if (patch.dtstart !== undefined || patch.timezone !== undefined || patch.rrule !== undefined) {
            const openInstance = await this.repository.findOpenInstance(args.ruleId);
            if (openInstance?.recurrenceInstanceDate) {
                await this.repository.updateInstanceWindow({
                    taskId: openInstance.id,
                    window: RecurrenceParser.instanceWindowUtc({
                        occurrenceDate: openInstance.recurrenceInstanceDate,
                        dtstart: updated.dtstart,
                        hasTime: updated.hasTime,
                        timezone: updated.timezone,
                        durationMinutes: updated.templateDurationMinutes,
                    }),
                });
            }
        }

        eventBus.emit('recurrence.updated', { rule: updated, changes: patch, initiatorId: this.initiatorId });
        return ok(await this.cleanRuleFieldsRegardPermissions(updated));
    }

    async pauseRule(ruleId: number): Promise<RecurrenceResult<RecurrenceRulesSchemaTypeForSelect>> {
        const rule = await this.repository.getById(ruleId);
        if (!rule) return fail('not_found');
        if (rule.state !== 'active') return fail('invalid_state', `can not pause a ${rule.state} series`);

        const updated = await this.repository.patch({ ruleId, patch: { state: 'paused' } });
        if (!updated) return fail('invalid_state');
        eventBus.emit('recurrence.paused', { ruleId, goalId: rule.goalId, initiatorId: this.initiatorId });
        return ok(await this.cleanRuleFieldsRegardPermissions(updated));
    }

    async resumeRule(ruleId: number): Promise<RecurrenceResult<RecurrenceRulesSchemaTypeForSelect>> {
        const rule = await this.repository.getById(ruleId);
        if (!rule) return fail('not_found');
        if (rule.state !== 'paused') return fail('invalid_state', `can not resume a ${rule.state} series`);

        const updated = await this.repository.patch({ ruleId, patch: { state: 'active' } });
        if (!updated) return fail('invalid_state');

        // Occurrences missed while paused are not backfilled; if the open
        // instance was completed during the pause, restart the chain from today.
        const openInstance = await this.repository.findOpenInstance(ruleId);
        if (!openInstance) {
            await this.generator.materializeNext({ ruleId, initiatorId: this.initiatorId });
        }

        eventBus.emit('recurrence.resumed', { ruleId, goalId: rule.goalId, initiatorId: this.initiatorId });
        return ok(await this.cleanRuleFieldsRegardPermissions(updated));
    }

    /** Skip the current occurrence: the open instance is removed and the card "jumps" to the next date. */
    async skipCurrent(ruleId: number): Promise<RecurrenceResult<RecurrenceRuleDetails>> {
        const rule = await this.repository.getById(ruleId);
        if (!rule) return fail('not_found');
        if (rule.state !== 'active') return fail('invalid_state', `can not skip in a ${rule.state} series`);

        const openInstance = await this.repository.findOpenInstance(ruleId);
        if (!openInstance || !openInstance.recurrenceInstanceDate) return fail('invalid_state', 'series has no open instance');

        await this.repository.addSkipDate({ ruleId, skipDate: openInstance.recurrenceInstanceDate });
        await this.tasksRepository.deleteTaskNew({ taskId: openInstance.id });
        eventBus.emit('task.deleted', { taskId: openInstance.id, goalId: rule.goalId, initiatorId: this.initiatorId });
        eventBus.emit('recurrence.instanceSkipped', {
            ruleId,
            goalId: rule.goalId,
            date: openInstance.recurrenceInstanceDate,
            initiatorId: this.initiatorId,
        });

        await this.generator.materializeNext({ ruleId, initiatorId: this.initiatorId });
        return this.getDetails(ruleId);
    }

    /** Delete the series; existing instances stay as ordinary tasks (FK SET NULL). */
    async deleteRule(ruleId: number): Promise<RecurrenceResult<{ deleted: true }>> {
        const rule = await this.repository.getById(ruleId);
        if (!rule) return fail('not_found');

        const deleted = await this.repository.deleteById(ruleId);
        if (!deleted) return fail('invalid_state');
        eventBus.emit('recurrence.deleted', { ruleId, goalId: rule.goalId, initiatorId: this.initiatorId });
        return ok({ deleted: true });
    }

    /** Wall-clock difference between the task's start and end, treating missing times as midnight. */
    private durationFromTask(args: {
        startDate: string;
        startTime: string | null;
        endDate: string | null;
        endTime: string | null;
    }): number | null {
        if (!args.endDate) return null;
        const start = new Date(`${args.startDate}T${args.startTime ?? '00:00:00'}Z`).getTime();
        const end = new Date(`${args.endDate}T${args.endTime ?? '00:00:00'}Z`).getTime();
        if (Number.isNaN(start) || Number.isNaN(end)) return null;
        const minutes = Math.round((end - start) / 60_000);
        return minutes > 0 ? minutes : null;
    }
}
