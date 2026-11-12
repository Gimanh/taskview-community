import { describe, expect, it } from 'vitest';
import { StartDashboardTaskPicker } from '../StartDashboardTaskPicker';
import type { StartDashboardAttentionCandidate, StartDashboardTaskPickerArgs } from '../start.types';

// Wednesday noon in Belgrade (UTC+1)
const NOW = new Date('2026-11-11T11:00:00Z');
const TZ = 'Europe/Belgrade';

let nextId = 0;
const candidate = (fields: Partial<StartDashboardAttentionCandidate>): StartDashboardAttentionCandidate => ({
    id: ++nextId,
    goalId: 1,
    endDate: null,
    endTime: null,
    ...fields,
});

const pickerFor = (args: Pick<StartDashboardTaskPickerArgs, 'bucket' | 'date'>) =>
    new StartDashboardTaskPicker({ now: NOW, tz: TZ, ...args });

describe('StartDashboardTaskPicker', () => {
    it('lists the overdue tasks, the most overdue first, and leaves out the ones still on time', () => {
        const yesterday = candidate({ endDate: '2026-11-10' });
        const lastWeek = candidate({ endDate: '2026-11-04' });
        const passedThisMorning = candidate({ endDate: '2026-11-11', endTime: '09:00:00' });
        const laterToday = candidate({ endDate: '2026-11-11', endTime: '15:00:00' });
        const today = candidate({ endDate: '2026-11-11' });
        const picker = pickerFor({ bucket: 'overdue' });

        const picked = picker.pick([yesterday, lastWeek, passedThisMorning, laterToday, today]);

        expect(picked.map((task) => task.id)).toEqual([lastWeek.id, yesterday.id, passedThisMorning.id]);
        expect(picked.map((task) => picker.clock.daysLate(task))).toEqual([7, 1, 0]);
    });

    it("asks for deadlines up to the caller's tomorrow when listing overdue tasks", () => {
        expect(pickerFor({ bucket: 'overdue' }).deadlineRange()).toEqual({ until: '2026-11-12' });
    });

    it('lists the tasks due on a day by their time, the untimed ones last', () => {
        const untimed = candidate({ endDate: '2026-11-13' });
        const evening = candidate({ endDate: '2026-11-13', endTime: '18:00:00' });
        const morning = candidate({ endDate: '2026-11-13', endTime: '08:30:00' });
        const otherDay = candidate({ endDate: '2026-11-14' });
        const picker = pickerFor({ bucket: 'day', date: '2026-11-13' });

        expect(picker.deadlineRange()).toEqual({ from: '2026-11-13', until: '2026-11-13' });
        expect(picker.pick([untimed, evening, morning, otherDay]).map((task) => task.id)).toEqual([
            morning.id,
            evening.id,
            untimed.id,
        ]);
        expect(picker.clock.daysLate(untimed)).toBe(-1);
    });

    it("keeps a task whose time already passed out of today's column: it is overdue", () => {
        const passed = candidate({ endDate: '2026-11-11', endTime: '09:00:00' });
        const ahead = candidate({ endDate: '2026-11-11', endTime: '15:00:00' });

        expect(pickerFor({ bucket: 'day', date: '2026-11-11' }).pick([passed, ahead])).toEqual([ahead]);
    });

    it("takes a week as seven days from its first day in the caller's timezone", () => {
        const picker = pickerFor({ bucket: 'week', date: '2026-11-09' });

        expect(picker.completedRange()).toEqual({
            from: new Date('2026-11-08T23:00:00Z'),
            to: new Date('2026-11-15T23:00:00Z'),
        });
        // Half past midnight in Belgrade on Monday is still Sunday in UTC
        expect(picker.clock.dayKeyOf(new Date('2026-11-08T23:30:00Z'))).toBe('2026-11-09');
    });

    it('keeps a week seven calendar days long across a daylight saving change', () => {
        const range = pickerFor({ bucket: 'week', date: '2026-10-19' }).completedRange();

        expect(range.from).toEqual(new Date('2026-10-18T22:00:00Z'));
        expect(range.to).toEqual(new Date('2026-10-25T23:00:00Z'));
    });
});
