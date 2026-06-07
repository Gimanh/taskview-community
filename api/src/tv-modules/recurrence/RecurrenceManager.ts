import type { RecurrenceRulesSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { eventBus } from '../../core/EventBus';
import { GoalPermissions } from '../../types/auth.types';
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

export class RecurrenceManager {
    private readonly user: AppUser;
    public readonly repository: RecurrenceRepository;
    private readonly generator: RecurrenceGenerator;
    private readonly tasksRepository: TasksRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new RecurrenceRepository();
        this.generator = new RecurrenceGenerator();
        this.tasksRepository = new TasksRepository();
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
        try {
            RecurrenceParser.validateRuleString(args.rrule);
            dtstart = RecurrenceParser.parseDtstart(args.dtstart);
        } catch (err) {
            return fail('invalid_rule', (err as Error).message);
        }

        const originInstanceDate = RecurrenceParser.firstOccurrenceDate({ rrule: args.rrule, dtstart });
        if (!originInstanceDate) return fail('invalid_rule', 'rule produces no occurrences');

        const rule = await this.repository.create({
            goalId: task.goalId,
            templateTaskId: task.id,
            templateDescription: task.description ?? '',
            templateNote: task.note,
            templatePriorityId: task.priorityId,
            templateStatusId: task.statusId,
            templateGoalListId: task.goalListId,
            templateDurationMinutes: this.durationFromTask({
                startDate: task.startDate ?? originInstanceDate,
                startTime: task.startTime,
                endDate: task.endDate,
                endTime: task.endTime,
            }),
            rrule: args.rrule,
            dtstart,
            timezone: args.timezone,
            lastInstanceDate: originInstanceDate,
            notifyOnOccurrence: args.notifyOnOccurrence ?? false,
            creatorId: this.initiatorId,
        });
        if (!rule) return fail('invalid_state', 'could not create rule');

        // The origin task becomes the first (and only open) instance of the series.
        await this.repository.attachTaskToRule({ taskId: task.id, ruleId: rule.id, instanceDate: originInstanceDate });
        // Normalize its window into the same UTC frame future instances will use —
        // otherwise a series created through a non-browser client (MCP, raw API)
        // could leave the origin and its successors in different time frames.
        await this.repository.applyInstanceWindow({
            taskId: task.id,
            window: RecurrenceParser.instanceWindowUtc({
                occurrenceDate: originInstanceDate,
                dtstart,
                timezone: args.timezone,
                durationMinutes: rule.templateDurationMinutes,
            }),
        });

        const [assignees, tags] = await Promise.all([
            this.repository.getTaskAssignees(task.id),
            this.repository.getTaskTags(task.id),
        ]);
        await Promise.all([
            this.repository.setTemplateAssignees({ ruleId: rule.id, collabUserIds: assignees }),
            this.repository.setTemplateTags({ ruleId: rule.id, tagIds: tags }),
        ]);

        eventBus.emit('recurrence.created', { rule, initiatorId: this.initiatorId });
        return ok(rule);
    }

    async getDetails(ruleId: number): Promise<RecurrenceResult<RecurrenceRuleDetails>> {
        const rule = await this.repository.getById(ruleId);
        if (!rule) return fail('not_found');
        const [skipDates, openInstance] = await Promise.all([
            this.repository.getSkipDates(ruleId),
            this.repository.findOpenInstance(ruleId),
        ]);

        // Notes are gated by a separate permission in the task API
        // (cleanTaskFieldsRegardPermissions) — the series endpoints must not
        // become a side door to them.
        const checker = await this.user.permissionsFetcher.getCheckerForGoal(rule.goalId).catch(() => null);
        if (!checker?.hasPermissions(GoalPermissions.TASK_CAN_WATCH_NOTE)) {
            rule.templateNote = null;
            if (openInstance) openInstance.note = null;
        }

        return ok({ rule, skipDates, openInstance });
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
                patch.dtstart = RecurrenceParser.parseDtstart(args.dtstart);
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
        if (args.notifyOnOccurrence !== undefined) patch.notifyOnOccurrence = args.notifyOnOccurrence;
        if (args.templateOverrides) {
            const o = args.templateOverrides;
            if (o.description !== undefined) patch.templateDescription = o.description;
            if (o.note !== undefined) patch.templateNote = o.note;
            if (o.priorityId !== undefined) patch.templatePriorityId = o.priorityId;
            if (o.statusId !== undefined) patch.templateStatusId = o.statusId;
            if (o.goalListId !== undefined) patch.templateGoalListId = o.goalListId;
            if (o.durationMinutes !== undefined) patch.templateDurationMinutes = o.durationMinutes;
        }
        if (Object.keys(patch).length === 0) return ok(rule);

        const updated = await this.repository.patch({ ruleId: args.ruleId, patch });
        if (!updated) return fail('invalid_state');

        eventBus.emit('recurrence.updated', { rule: updated, changes: patch, initiatorId: this.initiatorId });
        return ok(updated);
    }

    async pauseRule(ruleId: number): Promise<RecurrenceResult<RecurrenceRulesSchemaTypeForSelect>> {
        const rule = await this.repository.getById(ruleId);
        if (!rule) return fail('not_found');
        if (rule.state !== 'active') return fail('invalid_state', `can not pause a ${rule.state} series`);

        const updated = await this.repository.patch({ ruleId, patch: { state: 'paused' } });
        if (!updated) return fail('invalid_state');
        eventBus.emit('recurrence.paused', { ruleId, goalId: rule.goalId, initiatorId: this.initiatorId });
        return ok(updated);
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
        return ok(updated);
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
