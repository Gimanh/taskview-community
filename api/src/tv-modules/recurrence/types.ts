import { type } from 'arktype';
import type { RecurrenceRulesSchemaTypeForSelect, TasksSchemaTypeForSelect } from 'taskview-db-schemas';

/** Request validators (ArkType) */

export const RecurrenceArkTypeCreate = type({
    taskId: 'number',
    rrule: 'string > 0',
    dtstart: 'string', // 'YYYY-MM-DDTHH:mm:ss' floating wall-clock, no TZ suffix
    timezone: 'string > 0', // IANA name, e.g. 'Europe/Moscow'
    'notifyOnOccurrence?': 'boolean',
});

export const RecurrenceArkTypeUpdate = type({
    ruleId: 'number',
    'rrule?': 'string > 0',
    'dtstart?': 'string',
    'timezone?': 'string > 0',
    'notifyOnOccurrence?': 'boolean',
    'templateOverrides?': type({
        'description?': 'string',
        'note?': 'string | null',
        'priorityId?': '1 | 2 | 3 | null',
        'statusId?': 'number | null',
        'goalListId?': 'number | null',
        'durationMinutes?': 'number | null',
    }),
});

export const RecurrenceArkTypeRuleIdParam = type({
    ruleId: type('string | number').pipe((v) => Number(v)),
});

export const RecurrenceArkTypeTaskIdParam = type({
    taskId: type('string | number').pipe((v) => Number(v)),
});

/** Inferred argument types (args-as-object) */

export type RecurrenceCreateArgs = typeof RecurrenceArkTypeCreate.infer;
export type RecurrenceUpdateArgs = typeof RecurrenceArkTypeUpdate.infer;
export type RecurrenceTemplateOverrides = NonNullable<RecurrenceUpdateArgs['templateOverrides']>;

/** Generator args */

export type MaterializeNextArgs = {
    ruleId: number;
    /** Who triggered materialization (instance completer, resume initiator or rule creator for the reconcile job). */
    initiatorId: number;
};

/** Parser args */

export type ParseRuleArgs = { rrule: string; dtstart: Date };
export type NextOccurrenceArgs = {
    rrule: string;
    dtstart: Date;
    /** 'YYYY-MM-DD' — next occurrence is searched strictly after this day. */
    afterDate: string;
    skipDates: Set<string>;
};
export type InstanceWindowArgs = {
    /** 'YYYY-MM-DD' wall-clock occurrence date in the rule's timezone. */
    occurrenceDate: string;
    dtstart: Date;
    timezone: string;
    durationMinutes: number | null;
};
export type InstanceWindow = {
    startDate: string;
    startTime: string | null;
    endDate: string | null;
    endTime: string | null;
};

/** Repository args */

export type RecurrenceRulePatchArgs = {
    ruleId: number;
    patch: Partial<{
        rrule: string;
        dtstart: Date;
        timezone: string;
        state: 'active' | 'paused' | 'ended';
        lastInstanceDate: string;
        instancesCreated: number;
        notifyOnOccurrence: boolean;
        templateDescription: string;
        templateNote: string | null;
        templatePriorityId: 1 | 2 | 3 | null;
        templateStatusId: number | null;
        templateGoalListId: number | null;
        templateDurationMinutes: number | null;
        templateTaskId: number | null;
    }>;
};

export type AttachTaskToRuleArgs = { taskId: number; ruleId: number; instanceDate: string };
export type AddSkipDateArgs = { ruleId: number; skipDate: string };
export type SetTemplateAssigneesArgs = { ruleId: number; collabUserIds: number[] };
export type SetTemplateTagsArgs = { ruleId: number; tagIds: number[] };
export type RemoveTemplateAssigneeFromGoalArgs = { goalId: number; collabUserId: number };
export type ApplyInstanceWindowArgs = { taskId: number; window: InstanceWindow };

/** Detail shape returned by GET endpoints */

export type RecurrenceRuleDetails = {
    rule: RecurrenceRulesSchemaTypeForSelect;
    skipDates: string[];
    openInstance: TasksSchemaTypeForSelect | null;
};

export type RecurrenceErrorCode = 'not_found' | 'conflict' | 'invalid_state' | 'invalid_rule';
export type RecurrenceResult<T> = { ok: true; data: T } | { ok: false; code: RecurrenceErrorCode; message?: string };
