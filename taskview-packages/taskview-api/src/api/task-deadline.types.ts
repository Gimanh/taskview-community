export type TaskDeadlineCheckArgs = {
    /** YYYY-MM-DD, or a longer date string that starts with it */
    endDate: string | null;
    /** HH:MM or HH:MM:SS; the app stores deadline times in UTC */
    endTime: string | null;
    now: Date;
    /** The viewer's current day, YYYY-MM-DD */
    today: string;
};
