import { describe, expect, it } from 'vitest';
import { StartDashboardBuilder } from '../StartDashboardBuilder';
import type {
    StartDashboardAttentionCandidate,
    StartDashboardBuildArgs,
    StartDashboardOpenGroup,
    StartDashboardWorkloadGroup,
} from '../start.types';

// Wednesday noon in Belgrade (UTC+1)
const NOW = new Date('2026-11-11T11:00:00Z');
const TZ = 'Europe/Belgrade';

const group = (fields: Partial<StartDashboardOpenGroup>): StartDashboardOpenGroup => ({
    goalId: 1,
    endDate: null,
    endTime: null,
    priorityId: null,
    count: 1,
    ...fields,
});

const workloadGroup = (fields: Partial<StartDashboardWorkloadGroup>): StartDashboardWorkloadGroup => ({
    goalId: 1,
    email: null,
    endDate: null,
    endTime: null,
    count: 1,
    ...fields,
});

let nextId = 0;
const candidate = (fields: Partial<StartDashboardAttentionCandidate>): StartDashboardAttentionCandidate => ({
    id: ++nextId,
    goalId: 1,
    endDate: null,
    endTime: null,
    ...fields,
});

const builderFor = (args: Partial<StartDashboardBuildArgs>) =>
    new StartDashboardBuilder({
        now: NOW,
        tz: TZ,
        weekStart: 1,
        openGroups: [],
        workloadGroups: [],
        attentionCandidates: [],
        goalCounts: [],
        completedDates: [],
        assigneeGoalIds: new Set([1, 2]),
        priorityGoalIds: new Set([1, 2]),
        ...args,
    });

const build = (args: Partial<StartDashboardBuildArgs>) =>
    builderFor(args).build({ descriptions: new Map(), emails: new Map() });

describe('StartDashboardBuilder', () => {
    it('splits open tasks into overdue, due today, this week and undated', () => {
        const dashboard = build({
            openGroups: [
                group({ endDate: '2026-11-06', count: 2 }),
                group({ endDate: '2026-11-10' }),
                group({ endDate: '2026-11-11' }),
                group({ endDate: '2026-11-13', count: 3 }),
                group({ endDate: '2026-11-15' }),
                group({ endDate: '2026-11-16' }),
                group({ count: 4 }),
            ],
            goalCounts: [{ goalId: 1, done: 3 }],
        });

        expect(dashboard.today).toBe('2026-11-11');
        expect(dashboard.totals).toEqual({
            total: 16,
            done: 3,
            open: 13,
            overdue: 3,
            dueToday: 1,
            dueThisWeek: 5,
            undated: 4,
        });
        expect(dashboard.runway.map((day) => day.count)).toEqual([1, 0, 3, 0, 1, 1, 0]);
        expect(dashboard.runway[0].date).toBe('2026-11-11');
        expect(dashboard.attentionTotal).toBe(4);
    });

    it('treats a deadline with a time as overdue once that moment has passed', () => {
        const dashboard = build({
            openGroups: [
                group({ endDate: '2026-11-11', endTime: '10:00:00' }),
                group({ endDate: '2026-11-11', endTime: '12:00:00' }),
            ],
        });

        expect(dashboard.totals.overdue).toBe(1);
        expect(dashboard.totals.dueToday).toBe(1);
        expect(dashboard.runway[0].count).toBe(1);
    });

    it('counts "today" in the caller timezone, not in UTC', () => {
        const lateEvening = new Date('2026-11-11T23:30:00Z');
        const dashboard = build({ now: lateEvening, openGroups: [group({ endDate: '2026-11-11' })] });

        expect(dashboard.today).toBe('2026-11-12');
        expect(dashboard.totals.overdue).toBe(1);
        expect(StartDashboardBuilder.attentionUntil({ now: lateEvening, tz: TZ })).toBe('2026-11-13');
    });

    it('lists the most overdue tasks first, then the ones due today, five at most', () => {
        const late = [10, 9, 8, 7].map((day) => candidate({ endDate: `2026-11-${String(day).padStart(2, '0')}` }));
        const passedToday = candidate({ endDate: '2026-11-11', endTime: '09:00:00' });
        const dueToday = candidate({ endDate: '2026-11-11' });
        const tomorrow = candidate({ endDate: '2026-11-12' });
        const builder = builderFor({ attentionCandidates: [tomorrow, dueToday, passedToday, ...late] });

        const expected = [late[3], late[2], late[1], late[0], passedToday].map((task) => task.id);
        expect(builder.attentionTaskIds()).toEqual(expected);

        const attention = builder.build({
            descriptions: new Map([[late[3].id, 'Oldest']]),
            emails: new Map([[late[3].id, 'anna@example.com']]),
        }).attention;
        expect(attention.map((task) => task.daysLate)).toEqual([4, 3, 2, 1, 0]);
        expect(attention[0]).toMatchObject({ description: 'Oldest', assigneeEmail: 'anna@example.com' });
    });

    it('marks a task that is due today and still on time with -1 days late', () => {
        const dueToday = candidate({ endDate: '2026-11-11' });
        const attention = build({ attentionCandidates: [dueToday] }).attention;

        expect(attention).toEqual([{ id: dueToday.id, goalId: 1, description: '', daysLate: -1, assigneeEmail: null }]);
    });

    it('puts completed tasks into weeks that start on the requested day', () => {
        const completedDates = [
            new Date('2026-11-09T09:00:00Z'),
            new Date('2026-11-08T22:30:00Z'),
            new Date('2026-11-08T09:00:00Z'),
            new Date('2026-10-20T09:00:00Z'),
        ];

        const mondayWeeks = build({ completedDates }).weeks;
        expect(mondayWeeks).toHaveLength(12);
        expect(mondayWeeks.at(-1)).toEqual({ start: '2026-11-09', count: 1 });
        expect(mondayWeeks.at(-2)).toEqual({ start: '2026-11-02', count: 2 });
        expect(mondayWeeks.at(-4)).toEqual({ start: '2026-10-19', count: 1 });

        const sundayWeeks = build({ completedDates, weekStart: 0 }).weeks;
        expect(sundayWeeks.at(-1)).toEqual({ start: '2026-11-08', count: 3 });
    });

    it('counts the pace window, the window before it and the last 7 days from now', () => {
        const dashboard = build({
            completedDates: [
                new Date('2026-11-10T09:00:00Z'),
                new Date('2026-11-03T09:00:00Z'),
                new Date('2026-10-20T09:00:00Z'),
                new Date('2026-10-01T09:00:00Z'),
            ],
        });

        expect(dashboard.completedLast7Days).toBe(1);
        expect(dashboard.paceWindowWeeks).toBe(4);
        expect(dashboard.completedInPaceWindow).toBe(3);
        expect(dashboard.completedInPreviousPaceWindow).toBe(1);
    });

    it('merges workload by email across projects and keeps unassigned tasks last', () => {
        const dashboard = build({
            workloadGroups: [
                workloadGroup({ goalId: 1, email: 'Anna@example.com', endDate: '2026-11-01' }),
                workloadGroup({ goalId: 2, email: 'anna@example.com', count: 2 }),
                workloadGroup({ goalId: 2, email: null, count: 4 }),
                workloadGroup({ goalId: 1, email: 'boris@example.com' }),
            ],
        });

        expect(dashboard.workload).toEqual([
            { email: 'Anna@example.com', open: 3, overdue: 1 },
            { email: 'boris@example.com', open: 1, overdue: 0 },
            { email: null, open: 4, overdue: 0 },
        ]);
        expect(dashboard.workloadGoalIds).toEqual([1, 2]);
    });

    it('leaves out assignees and priorities of projects where they are not visible', () => {
        const hidden = candidate({ goalId: 2, endDate: '2026-11-01' });
        const dashboard = builderFor({
            openGroups: [
                group({ goalId: 2, priorityId: 3, endDate: '2026-11-01' }),
                group({ goalId: 1, priorityId: 1 }),
            ],
            workloadGroups: [
                workloadGroup({ goalId: 2, email: 'hidden@example.com', endDate: '2026-11-01' }),
                workloadGroup({ goalId: 1, email: null }),
            ],
            attentionCandidates: [hidden],
            assigneeGoalIds: new Set([1]),
            priorityGoalIds: new Set([1]),
        }).build({ descriptions: new Map(), emails: new Map([[hidden.id, 'hidden@example.com']]) });

        expect(dashboard.workload).toEqual([{ email: null, open: 1, overdue: 0 }]);
        expect(dashboard.workloadGoalIds).toEqual([1]);
        expect(dashboard.priorities).toEqual([{ id: 1, count: 1 }]);
        expect(dashboard.attention[0].assigneeEmail).toBeNull();
        expect(dashboard.totals.open).toBe(2);
    });

    it('returns no workload or priorities when no project shows them', () => {
        const dashboard = build({
            openGroups: [group({ priorityId: 2 })],
            workloadGroups: [workloadGroup({ email: 'anna@example.com' })],
            assigneeGoalIds: new Set(),
            priorityGoalIds: new Set(),
        });

        expect(dashboard.workload).toBeNull();
        expect(dashboard.workloadGoalIds).toEqual([]);
        expect(dashboard.priorities).toBeNull();
    });

    it('breaks open tasks down by priority, the highest first', () => {
        const dashboard = build({
            openGroups: [
                group({ priorityId: 1, count: 2 }),
                group({ priorityId: 3, endDate: '2026-11-20' }),
                group({ priorityId: 3, count: 2 }),
                group({ count: 5 }),
            ],
        });

        expect(dashboard.priorities).toEqual([
            { id: 3, count: 3 },
            { id: 1, count: 2 },
            { id: 0, count: 5 },
        ]);
    });

    it('sums up each project, the most overdue first', () => {
        const dashboard = build({
            openGroups: [group({ goalId: 1 }), group({ goalId: 2, endDate: '2026-11-01' }), group({ goalId: 2 })],
            goalCounts: [
                { goalId: 1, done: 4 },
                { goalId: 3, done: 2 },
            ],
        });

        expect(dashboard.projects).toEqual([
            { goalId: 2, total: 2, done: 0, open: 2, overdue: 1 },
            { goalId: 1, total: 5, done: 4, open: 1, overdue: 0 },
            { goalId: 3, total: 2, done: 2, open: 0, overdue: 0 },
        ]);
    });
});
