import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import type { InstanceWindow, InstanceWindowArgs, NextOccurrenceArgs, ParseRuleArgs } from './types';

const ALLOWED_FREQUENCIES = new Set<number>([RRule.YEARLY, RRule.MONTHLY, RRule.WEEKLY, RRule.DAILY]);
const MAX_COUNT = 10000;

/**
 * All recurrence math happens in a single floating wall-clock frame:
 * `dtstart` is a Date whose UTC components equal the wall-clock components of
 * the series (the API runs with TZ=UTC, so naive DB timestamps read back this
 * way). Occurrences returned by `rrule` carry the same convention and are
 * written component-wise into tasks.start_date / start_time. The IANA timezone
 * of the rule is only used to resolve "today" for the user.
 */
export class RecurrenceParser {
    /** Throws a human-readable Error if the RRULE string is unsupported. */
    static validateRuleString(rruleString: string): void {
        let options: ReturnType<typeof RRule.parseString>;
        try {
            options = RRule.parseString(rruleString);
        } catch {
            throw new Error('Invalid RRULE string');
        }
        if (options.freq === undefined || !ALLOWED_FREQUENCIES.has(options.freq)) {
            throw new Error('FREQ must be one of DAILY, WEEKLY, MONTHLY, YEARLY');
        }
        if (options.interval !== undefined && (!Number.isInteger(options.interval) || options.interval < 1)) {
            throw new Error('INTERVAL must be a positive integer');
        }
        if (options.count !== undefined && options.count !== null && (options.count < 1 || options.count > MAX_COUNT)) {
            throw new Error(`COUNT must be between 1 and ${MAX_COUNT}`);
        }
        if (options.count && options.until) {
            throw new Error('COUNT and UNTIL are mutually exclusive (RFC 5545)');
        }
    }

    /** COUNT encoded in the RRULE string, if any. */
    static getCount(rruleString: string): number | null {
        return RRule.parseString(rruleString).count ?? null;
    }

    /**
     * First occurrence date strictly after `afterDate`, skipping explicit skip
     * dates. COUNT is intentionally stripped: the cap is "N materialized
     * instances" enforced by the caller via instances_created, not "N calendar
     * positions" (a series completed late must not silently lose remaining runs).
     * Returns 'YYYY-MM-DD' or null when the series is over (UNTIL passed / no
     * more occurrences within the search horizon).
     */
    static nextOccurrenceDate(args: NextOccurrenceArgs): string | null {
        const options = RRule.parseString(args.rrule);
        delete options.count;
        const rule = new RRule({ ...options, dtstart: args.dtstart });

        // End of the boundary day in the floating frame: "strictly after that day".
        let searchFrom = new Date(`${args.afterDate}T23:59:59.999Z`);
        // Skip dates form a finite set; each loop pass moves searchFrom forward, so this terminates.
        for (;;) {
            const occurrence = rule.after(searchFrom, false);
            if (!occurrence) return null;
            const isoDate = RecurrenceParser.toIsoDate(occurrence);
            if (!args.skipDates.has(isoDate)) return isoDate;
            searchFrom = new Date(`${isoDate}T23:59:59.999Z`);
        }
    }

    /** First occurrence on or after the dtstart day — the instance date of the origin task. */
    static firstOccurrenceDate(args: ParseRuleArgs): string | null {
        const options = RRule.parseString(args.rrule);
        delete options.count;
        const rule = new RRule({ ...options, dtstart: args.dtstart });
        const occurrence = rule.after(new Date(args.dtstart.getTime() - 1), true);
        return occurrence ? RecurrenceParser.toIsoDate(occurrence) : null;
    }

    /** Today's date in the rule's IANA timezone. */
    static todayInTimezone(timezone: string): string {
        const today = DateTime.now().setZone(timezone);
        return today.isValid ? (today.toISODate() as string) : (DateTime.utc().toISODate() as string);
    }

    /** 'HH:mm:ss' wall-clock time of day of the series, or null when the series carries no time (midnight dtstart). */
    static timeOfDay(dtstart: Date): string | null {
        const hours = dtstart.getUTCHours();
        const minutes = dtstart.getUTCMinutes();
        if (hours === 0 && minutes === 0) return null;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:00`;
    }

    static isValidTimezone(timezone: string): boolean {
        return DateTime.now().setZone(timezone).isValid;
    }

    /**
     * UTC start/end window of a single occurrence. The series is anchored to
     * wall-clock time in its IANA timezone ("every day at 9:00 in Berlin"),
     * while tasks store UTC instants — so the instant is recomputed for every
     * occurrence date with the offset valid on that day (DST-aware): a summer
     * occurrence lands on 07:00 UTC, a winter one on 08:00 UTC, and the user
     * always sees 9:00 on the wall. Non-existent wall times on spring-forward
     * days are pushed forward by luxon to the nearest valid time.
     */
    static instanceWindowUtc(args: InstanceWindowArgs): InstanceWindow {
        const wallTime = RecurrenceParser.timeOfDay(args.dtstart);

        // Date-only series: calendar dates pass through untouched (no instant semantics).
        if (!wallTime) {
            const days = args.durationMinutes ? Math.floor(args.durationMinutes / (24 * 60)) : 0;
            // An occurrence is due on its own date — a series without an explicit
            // end is not a "no deadline" task, the deadline IS the occurrence date.
            const endDate =
                days > 0
                    ? RecurrenceParser.toIsoDate(new Date(new Date(`${args.occurrenceDate}T00:00:00Z`).getTime() + days * 24 * 60 * 60_000))
                    : args.occurrenceDate;
            return { startDate: args.occurrenceDate, startTime: null, endDate, endTime: null };
        }

        const [year, month, day] = args.occurrenceDate.split('-').map(Number);
        let start = DateTime.fromObject(
            { year, month, day, hour: args.dtstart.getUTCHours(), minute: args.dtstart.getUTCMinutes() },
            { zone: args.timezone }
        );
        if (!start.isValid) {
            start = DateTime.fromISO(`${args.occurrenceDate}T${wallTime}`, { zone: 'utc' });
        }
        const startUtc = start.toUTC();
        const window: InstanceWindow = {
            startDate: startUtc.toISODate() as string,
            startTime: startUtc.toFormat('HH:mm:ss'),
            // No explicit duration → due at the occurrence moment itself.
            endDate: startUtc.toISODate() as string,
            endTime: startUtc.toFormat('HH:mm:ss'),
        };
        if (args.durationMinutes !== null && args.durationMinutes > 0) {
            const endUtc = startUtc.plus({ minutes: args.durationMinutes });
            window.endDate = endUtc.toISODate() as string;
            window.endTime = endUtc.toFormat('HH:mm:ss');
        }
        return window;
    }

    /** Floating wall-clock 'YYYY-MM-DDTHH:mm:ss' string → Date with the same UTC components. */
    static parseDtstart(dtstart: string): Date {
        const date = new Date(`${dtstart}Z`);
        if (Number.isNaN(date.getTime())) throw new Error('Invalid dtstart');
        return date;
    }

    static toIsoDate(date: Date): string {
        return date.toISOString().slice(0, 10);
    }
}
