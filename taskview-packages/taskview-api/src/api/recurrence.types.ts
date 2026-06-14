import type { Task } from './tasks.api.types';

export type RecurrenceState = 'active' | 'paused' | 'ended';

export type RecurrenceRule = {
    id: number;
    goalId: number;
    templateTaskId: number | null;
    templateDescription: string | null;
    templateNote: string | null;
    templatePriorityId: 1 | 2 | 3 | null;
    templateStatusId: number | null;
    templateGoalListId: number | null;
    templateDurationMinutes: number | null;
    /** RFC 5545 RRULE string; COUNT/UNTIL live inside it. */
    rrule: string;
    /** Floating wall-clock 'YYYY-MM-DDTHH:mm:ss' anchor of the series. */
    dtstart: string;
    /** Whether the series is anchored to a wall-clock time (incl. 00:00) or is date-only. */
    hasTime: boolean;
    /** IANA timezone name, e.g. 'Europe/Moscow'. */
    timezone: string;
    state: RecurrenceState;
    lastInstanceDate: string;
    instancesCreated: number;
    notifyOnOccurrence: boolean;
    creatorId: number;
    createdAt: string;
    editedAt: string;
};

export type RecurrenceRuleDetails = {
    rule: RecurrenceRule;
    skipDates: string[];
    openInstance: Task | null;
};

export type RecurrenceCreateArgs = {
    taskId: number;
    rrule: string;
    /** 'YYYY-MM-DD' for a date-only series, 'YYYY-MM-DDTHH:mm:ss' for a timed one (incl. 00:00). */
    dtstart: string;
    timezone: string;
    notifyOnOccurrence?: boolean;
};

export type RecurrenceTemplateOverrides = Partial<{
    description: string;
    note: string | null;
    priorityId: 1 | 2 | 3 | null;
    statusId: number | null;
    goalListId: number | null;
    durationMinutes: number | null;
}>;

export type RecurrenceUpdateArgs = {
    ruleId: number;
    rrule?: string;
    dtstart?: string;
    timezone?: string;
    notifyOnOccurrence?: boolean;
    templateOverrides?: RecurrenceTemplateOverrides;
};
