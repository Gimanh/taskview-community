import type { LevelWithSilent } from 'pino';

export const LOG_LEVELS: readonly LevelWithSilent[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

export type LogLevelResolution = {
    level: LevelWithSilent;
    invalidValue: string | null;
};

export function resolveLogLevel(env: NodeJS.ProcessEnv): LogLevelResolution {
    const fallback: LevelWithSilent = env.NODE_ENV === 'production' ? 'info' : 'debug';
    const raw = env.LOG_LEVEL?.trim().toLowerCase();
    if (!raw) return { level: fallback, invalidValue: null };
    const known = LOG_LEVELS.find((level) => level === raw);
    return known ? { level: known, invalidValue: null } : { level: fallback, invalidValue: env.LOG_LEVEL as string };
}
