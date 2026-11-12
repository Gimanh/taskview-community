import { DateTime } from 'luxon';
import type {
    StartDashboard,
    StartDashboardAttentionTask,
    StartDashboardDay,
    StartDashboardPriority,
    StartDashboardProject,
    StartDashboardTotals,
    StartDashboardWeek,
    StartDashboardWorkloadRow,
} from 'taskview-api';
import { StartDashboardClock } from './StartDashboardClock';
import type {
    StartDashboardAttentionCandidate,
    StartDashboardAttentionDetails,
    StartDashboardBuildArgs,
    StartDashboardClockArgs,
    StartDashboardDeadline,
    StartDashboardOpenGroup,
} from './start.types';

const DATE_KEY = 'yyyy-MM-dd';
const PRIORITY_ORDER = [3, 2, 1, 0] as const;

/** Turns the counts the database made per project, deadline and priority into the dashboard of the main screen. */
export class StartDashboardBuilder {
    static readonly RUNWAY_DAYS = 7;
    static readonly WEEKS = 12;
    static readonly PACE_WEEKS = 4;
    static readonly ATTENTION_LIMIT = 5;
    /** How many of the earliest deadlines are looked at to pick the listed tasks */
    static readonly ATTENTION_CANDIDATES = 50;
    static readonly WORKLOAD_LIMIT = 6;

    private readonly clock: StartDashboardClock;
    private readonly now: DateTime;
    private readonly today: DateTime;
    private readonly todayKey: string;

    constructor(private readonly args: StartDashboardBuildArgs) {
        this.clock = new StartDashboardClock({ now: args.now, tz: args.tz });
        this.now = this.clock.now;
        this.today = this.clock.today;
        this.todayKey = this.clock.todayKey;
    }

    /** The earliest completion the dashboard needs: the first of its weeks, with a week to spare for any week start. */
    static completedSince(now: Date): Date {
        return DateTime.fromJSDate(now)
            .minus({ weeks: StartDashboardBuilder.WEEKS + 1 })
            .toJSDate();
    }

    /**
     * The last deadline day worth a look for the listed tasks: the caller's tomorrow,
     * because a deadline with a time is kept in UTC and may already have passed there.
     */
    static attentionUntil(args: StartDashboardClockArgs): string {
        return DateTime.fromJSDate(args.now, { zone: args.tz }).plus({ days: 1 }).toFormat(DATE_KEY);
    }

    /** The tasks listed by name, the most overdue first: their titles and assignees are loaded separately and passed to `build` */
    attentionTaskIds(): number[] {
        return this.attentionTasks().map((task) => task.id);
    }

    build(details: StartDashboardAttentionDetails): StartDashboard {
        const totals = this.totals();
        const paceWeeks = StartDashboardBuilder.PACE_WEEKS;
        const completedInPaceWindow = this.countCompletedSince(this.now.minus({ weeks: paceWeeks }));
        return {
            today: this.todayKey,
            totals,
            paceWindowWeeks: paceWeeks,
            completedInPaceWindow,
            completedInPreviousPaceWindow:
                this.countCompletedSince(this.now.minus({ weeks: paceWeeks * 2 })) - completedInPaceWindow,
            completedLast7Days: this.countCompletedSince(this.now.minus({ days: 7 })),
            runway: this.runway(),
            weeks: this.weeks(),
            attention: this.attention(details),
            attentionTotal: totals.overdue + totals.dueToday,
            workload: this.workload(),
            workloadGoalIds: [...this.args.assigneeGoalIds].sort((a, b) => a - b),
            priorities: this.priorities(),
            projects: this.projects(),
        };
    }

    private isOverdue(deadline: StartDashboardDeadline): boolean {
        return this.clock.isOverdue(deadline);
    }

    private isDueToday(deadline: StartDashboardDeadline): boolean {
        return deadline.endDate === this.todayKey && !this.isOverdue(deadline);
    }

    private weekStartOf(day: DateTime): DateTime {
        const daysIntoWeek = ((day.weekday % 7) - this.args.weekStart + 7) % 7;
        return day.startOf('day').minus({ days: daysIntoWeek });
    }

    private sum(groups: StartDashboardOpenGroup[]): number {
        return groups.reduce((total, group) => total + group.count, 0);
    }

    private totals(): StartDashboardTotals {
        const groups = this.args.openGroups;
        const weekEndKey = this.weekStartOf(this.today).plus({ days: 6 }).toFormat(DATE_KEY);
        const onTime = groups.filter((group) => !this.isOverdue(group));
        const done = this.args.goalCounts.reduce((total, goal) => total + goal.done, 0);
        const open = this.sum(groups);
        return {
            total: done + open,
            done,
            open,
            overdue: open - this.sum(onTime),
            dueToday: this.sum(onTime.filter((group) => group.endDate === this.todayKey)),
            dueThisWeek: this.sum(
                onTime.filter(
                    (group) => !!group.endDate && group.endDate >= this.todayKey && group.endDate <= weekEndKey
                )
            ),
            undated: this.sum(groups.filter((group) => !group.endDate)),
        };
    }

    private countCompletedSince(from: DateTime): number {
        const since = from.toMillis();
        return this.args.completedDates.filter((date) => date.getTime() >= since).length;
    }

    private runway(): StartDashboardDay[] {
        const counts = new Map<string, number>();
        for (const group of this.args.openGroups) {
            if (!group.endDate || this.isOverdue(group)) continue;
            counts.set(group.endDate, (counts.get(group.endDate) ?? 0) + group.count);
        }
        return Array.from({ length: StartDashboardBuilder.RUNWAY_DAYS }, (_, index) => {
            const date = this.today.plus({ days: index }).toFormat(DATE_KEY);
            return { date, count: counts.get(date) ?? 0 };
        });
    }

    private weeks(): StartDashboardWeek[] {
        const counts = new Map<string, number>();
        for (const date of this.args.completedDates) {
            const key = this.weekStartOf(DateTime.fromJSDate(date, { zone: this.args.tz })).toFormat(DATE_KEY);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const current = this.weekStartOf(this.today);
        return Array.from({ length: StartDashboardBuilder.WEEKS }, (_, index) => {
            const start = current.minus({ weeks: StartDashboardBuilder.WEEKS - 1 - index }).toFormat(DATE_KEY);
            return { start, count: counts.get(start) ?? 0 };
        });
    }

    private compareByDeadline(tasks: [StartDashboardAttentionCandidate, StartDashboardAttentionCandidate]): number {
        const [first, second] = tasks;
        return (first.endDate ?? '').localeCompare(second.endDate ?? '') || first.id - second.id;
    }

    private attentionTasks(): StartDashboardAttentionCandidate[] {
        const candidates = this.args.attentionCandidates;
        const late = candidates.filter((task) => this.isOverdue(task)).sort((a, b) => this.compareByDeadline([a, b]));
        const dueToday = candidates
            .filter((task) => this.isDueToday(task))
            .sort((a, b) => this.compareByDeadline([a, b]));
        return [...late, ...dueToday].slice(0, StartDashboardBuilder.ATTENTION_LIMIT);
    }

    private attention(details: StartDashboardAttentionDetails): StartDashboardAttentionTask[] {
        return this.attentionTasks().map((task) => ({
            id: task.id,
            goalId: task.goalId,
            description: details.descriptions.get(task.id) ?? '',
            daysLate: this.clock.daysLate(task),
            assigneeEmail: this.args.assigneeGoalIds.has(task.goalId) ? (details.emails.get(task.id) ?? null) : null,
        }));
    }

    private workload(): StartDashboardWorkloadRow[] | null {
        if (this.args.assigneeGoalIds.size === 0) return null;
        const rows = new Map<string | null, StartDashboardWorkloadRow>();
        for (const group of this.args.workloadGroups) {
            if (!this.args.assigneeGoalIds.has(group.goalId)) continue;
            const key = group.email?.toLowerCase() ?? null;
            const row = rows.get(key) ?? { email: group.email, open: 0, overdue: 0 };
            row.open += group.count;
            if (this.isOverdue(group)) row.overdue += group.count;
            rows.set(key, row);
        }
        const unassigned = rows.get(null);
        const assigned = [...rows.values()]
            .filter((row) => row.email !== null)
            .sort((a, b) => b.open - a.open || b.overdue - a.overdue || (a.email ?? '').localeCompare(b.email ?? ''))
            .slice(0, StartDashboardBuilder.WORKLOAD_LIMIT);
        return unassigned ? [...assigned, unassigned] : assigned;
    }

    private priorities(): StartDashboardPriority[] | null {
        if (this.args.priorityGoalIds.size === 0) return null;
        const groups = this.args.openGroups.filter((group) => this.args.priorityGoalIds.has(group.goalId));
        return PRIORITY_ORDER.map((id) => ({
            id,
            count: this.sum(groups.filter((group) => (group.priorityId ?? 0) === id)),
        })).filter((priority) => priority.count > 0);
    }

    private projects(): StartDashboardProject[] {
        const projects = new Map<number, StartDashboardProject>();
        const projectFor = (goalId: number) => {
            const project = projects.get(goalId) ?? { goalId, total: 0, done: 0, open: 0, overdue: 0 };
            projects.set(goalId, project);
            return project;
        };
        for (const goal of this.args.goalCounts) {
            const project = projectFor(goal.goalId);
            project.done = goal.done;
            project.total += goal.done;
        }
        for (const group of this.args.openGroups) {
            const project = projectFor(group.goalId);
            project.open += group.count;
            project.total += group.count;
            if (this.isOverdue(group)) project.overdue += group.count;
        }
        return [...projects.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open || a.goalId - b.goalId);
    }
}
