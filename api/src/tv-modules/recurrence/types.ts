import { type } from 'arktype';
import type {
    RecurrenceRulesSchemaTypeForInsert,
    RecurrenceRulesSchemaTypeForSelect,
    TasksSchemaTypeForSelect,
} from 'taskview-db-schemas';

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
    /** False → date-only occurrence (no start/end time). */
    hasTime: boolean;
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
        hasTime: boolean;
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

export type AddSkipDateArgs = { ruleId: number; skipDate: string };
export type RemoveTemplateAssigneeFromGoalArgs = { goalId: number; collabUserId: number };

/**
 * Atomic series creation: rule insert + origin task attachment (with its
 * window normalized to the series frame) + assignee/tag snapshot — one
 * transaction with the origin task row locked FOR UPDATE, so concurrent
 * creates on the same task serialize instead of producing two rules.
 */
export type CreateRuleWithOriginArgs = {
    rule: RecurrenceRulesSchemaTypeForInsert;
    originTaskId: number;
    originInstanceDate: string;
    window: InstanceWindow;
};
export type CreateRuleWithOriginResult =
    | { rule: RecurrenceRulesSchemaTypeForSelect }
    | { error: 'not_found' | 'conflict' | 'failed' };

/** Detail shape returned by GET endpoints */

export type RecurrenceRuleDetails = {
    rule: RecurrenceRulesSchemaTypeForSelect;
    skipDates: string[];
    openInstance: TasksSchemaTypeForSelect | null;
};

export type RecurrenceErrorCode = 'not_found' | 'conflict' | 'invalid_state' | 'invalid_rule';
export type RecurrenceResult<T> = { ok: true; data: T } | { ok: false; code: RecurrenceErrorCode; message?: string };
