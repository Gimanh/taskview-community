import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcessTimezone } from '../process-timezone';

vi.mock('../logget', () => ({ $logger: { warn: vi.fn() } }));

describe('ProcessTimezone', () => {
    const original = process.env.TZ;

    afterEach(() => {
        process.env.TZ = original;
        vi.restoreAllMocks();
    });

    it('switches a process started in another time zone to UTC', () => {
        process.env.TZ = 'Asia/Tokyo';
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(new Date('2026-01-01T00:00:00Z').getHours()).toBe(9);

        ProcessTimezone.enforceOnStartup();

        expect(process.env.TZ).toBe('UTC');
        expect(new Date('2026-01-01T00:00:00Z').getHours()).toBe(0);
        expect(new Date(2026, 0, 1).toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('warns that a non-UTC TZ is ignored', () => {
        process.env.TZ = 'Europe/Berlin';
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        ProcessTimezone.enforceOnStartup();

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('TZ="Europe/Berlin" is ignored'));
    });

    it('stays quiet when TZ is already UTC or unset', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        process.env.TZ = 'UTC';
        ProcessTimezone.enforceOnStartup();
        delete process.env.TZ;
        ProcessTimezone.enforceOnStartup();

        expect(warn).not.toHaveBeenCalled();
        expect(process.env.TZ).toBe('UTC');
    });
});
