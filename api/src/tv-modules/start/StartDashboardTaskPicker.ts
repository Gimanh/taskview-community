import { StartDashboardClock } from './StartDashboardClock';
import type {
    FetchDashboardCompletedRangeArgs,
    FetchDashboardDeadlineRangeArgs,
    StartDashboardAttentionCandidate,
    StartDashboardTaskPickerArgs,
} from './start.types';

export class StartDashboardTaskPicker {
    static readonly DEFAULT_LIMIT = 50;
    static readonly MAX_LIMIT = 100;

    readonly clock: StartDashboardClock;

    constructor(private readonly args: StartDashboardTaskPickerArgs) {
        this.clock = new StartDashboardClock({ now: args.now, tz: args.tz });
    }

    /**
     * The deadline days worth loading for the column. Overdue tasks reach the caller's tomorrow,
     * because a deadline with a time is kept in UTC and may already have passed there.
     */
    deadlineRange(): Omit<FetchDashboardDeadlineRangeArgs, 'goalIds'> {
        if (this.args.bucket === 'day' && this.args.date) return { from: this.args.date, until: this.args.date };
        return { until: this.clock.dayKey(this.clock.today.plus({ days: 1 })) };
    }

    /** The seven days of the week that starts on the given day, in the caller's timezone */
    completedRange(): Omit<FetchDashboardCompletedRangeArgs, 'goalIds' | 'limit' | 'offset'> {
        const from = this.clock.startOfDay(this.args.date ?? this.clock.todayKey);
        return { from: from.toJSDate(), to: from.plus({ weeks: 1 }).toJSDate() };
    }

    /** The open tasks of the column: the most overdue first, or by the time of day they are due */
    pick(candidates: StartDashboardAttentionCandidate[]): StartDashboardAttentionCandidate[] {
        if (this.args.bucket === 'overdue') {
            return candidates
                .filter((task) => this.clock.isOverdue(task))
                .sort((a, b) => (a.endDate ?? '').localeCompare(b.endDate ?? '') || a.id - b.id);
        }
        return candidates
            .filter((task) => task.endDate === this.args.date && !this.clock.isOverdue(task))
            .sort((a, b) => this.timeRank(a).localeCompare(this.timeRank(b)) || a.id - b.id);
    }

    // Tasks without a time of day come after the timed ones
    private timeRank(task: StartDashboardAttentionCandidate): string {
        return task.endTime ?? '99';
    }
}
