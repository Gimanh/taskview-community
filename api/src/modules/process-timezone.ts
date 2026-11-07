import { $logger } from './logget';

export const PROCESS_TIMEZONE = 'UTC';

export class ProcessTimezone {
    /**
     * Columns are TIMESTAMP without time zone, and node-postgres reads and writes
     * them in the process time zone — so the process must run in UTC no matter
     * what TZ the host or container was given.
     */
    static enforceOnStartup(): void {
        const configured = process.env.TZ;
        if (configured && configured !== PROCESS_TIMEZONE) {
            const message = `[timezone] TZ="${configured}" is ignored - the API always runs in ${PROCESS_TIMEZONE}`;
            console.warn(message);
            $logger.warn(message);
        }
        process.env.TZ = PROCESS_TIMEZONE;
    }
}
