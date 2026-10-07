import { describe, expect, it } from 'vitest';
import { resolveLogLevel } from '../log-level';

describe('resolveLogLevel', () => {
    it('keeps the old defaults when LOG_LEVEL is not set', () => {
        expect(resolveLogLevel({ NODE_ENV: 'production' })).toEqual({ level: 'info', invalidValue: null });
        expect(resolveLogLevel({ NODE_ENV: 'development' })).toEqual({ level: 'debug', invalidValue: null });
        expect(resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: '  ' })).toEqual({ level: 'info', invalidValue: null });
    });

    it('takes any pino level from LOG_LEVEL, case and spaces aside', () => {
        expect(resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: 'debug' }).level).toBe('debug');
        expect(resolveLogLevel({ NODE_ENV: 'development', LOG_LEVEL: ' WARN ' }).level).toBe('warn');
        expect(resolveLogLevel({ LOG_LEVEL: 'silent' }).level).toBe('silent');
        expect(resolveLogLevel({ LOG_LEVEL: 'trace' }).level).toBe('trace');
    });

    it('falls back to the default and reports an unknown value', () => {
        expect(resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: 'verbose' })).toEqual({ level: 'info', invalidValue: 'verbose' });
        expect(resolveLogLevel({ NODE_ENV: 'development', LOG_LEVEL: 'loud' })).toEqual({ level: 'debug', invalidValue: 'loud' });
    });
});
