import type { TaskDeadlineCheckArgs } from './task-deadline.types';

/**
 * Whether a task's deadline has passed. A deadline with a time passes at that moment;
 * a deadline without one passes when its day is over for the viewer.
 * The task row, the project dashboard and the main-screen dashboard all count "overdue" with this rule.
 */
export function isTaskDeadlinePassed(args: TaskDeadlineCheckArgs): boolean {
    if (!args.endDate) return false;
    const day = args.endDate.slice(0, 10);
    const time = args.endTime?.match(/^(\d{2}):(\d{2})/);
    if (time) return new Date(`${day}T${time[1]}:${time[2]}:00Z`) < args.now;
    return day < args.today;
}
