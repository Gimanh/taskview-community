/**
 * Parse UTC time string (HH:mm:ss) with date into a Date object
 */
export function parseUtcTime(dateStr: string, timeStr: string): Date | null {
    const match = timeStr.match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    return new Date(`${dateStr}T${match[1]}:${match[2]}:00Z`);
}

/**
 * Convert a local hour (e.g. 9 for 09:00) in a given IANA timezone
 * to a UTC Date for the specified date string (YYYY-MM-DD)
 */
export function localHourToUtc(dateStr: string, hour: number, timezone: string): Date {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });

        const utcMidnight = new Date(`${dateStr}T00:00:00Z`);
        const parts = formatter.formatToParts(utcMidnight);
        const tzHour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
        const tzDay = Number(parts.find(p => p.type === 'day')?.value ?? 0);
        const utcDay = utcMidnight.getUTCDate();

        let offsetHours = tzHour - utcMidnight.getUTCHours();
        if (tzDay > utcDay) offsetHours += 24;
        else if (tzDay < utcDay) offsetHours -= 24;

        const result = new Date(`${dateStr}T00:00:00Z`);
        result.setUTCHours(hour - offsetHours, 0, 0, 0);
        return result;
    } catch {
        const fallback = new Date(`${dateStr}T00:00:00Z`);
        fallback.setUTCHours(hour, 0, 0, 0);
        return fallback;
    }
}

