import { DateTime } from 'luxon';
import { isTaskDeadlinePassed } from 'taskview-api';
import type { StartDashboardClockArgs, StartDashboardDeadline } from './start.types';

const DATE_KEY = 'yyyy-MM-dd';

/** The caller's "now" and "today", and what a deadline means against them. */
export class StartDashboardClock {
    readonly now: DateTime;
    readonly today: DateTime;
    readonly todayKey: string;

    constructor(private readonly args: StartDashboardClockArgs) {
        this.now = DateTime.fromJSDate(args.now, { zone: args.tz });
        this.today = this.now.startOf('day');
        this.todayKey = this.dayKey(this.today);
    }

    dayKey(day: DateTime): string {
        return day.toFormat(DATE_KEY);
    }

    /** The caller's day a moment falls on, YYYY-MM-DD */
    dayKeyOf(moment: Date): string {
        return this.dayKey(DateTime.fromJSDate(moment, { zone: this.args.tz }));
    }

    /** Midnight of a YYYY-MM-DD day in the caller's timezone */
    startOfDay(day: string): DateTime {
        return DateTime.fromFormat(day, DATE_KEY, { zone: this.args.tz });
    }

    isOverdue(deadline: StartDashboardDeadline): boolean {
        return isTaskDeadlinePassed({
            endDate: deadline.endDate,
            endTime: deadline.endTime,
            now: this.args.now,
            today: this.todayKey,
        });
    }

    /** Whole days past the deadline; 0 when it passed earlier today, -1 when the deadline has not passed */
    daysLate(deadline: StartDashboardDeadline): number {
        if (!this.isOverdue(deadline)) return -1;
        const due = this.startOfDay(deadline.endDate ?? this.todayKey);
        return Math.max(Math.round(this.today.diff(due, 'days').days), 0);
    }
}
