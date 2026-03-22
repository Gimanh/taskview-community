import {
    NotificationChannel,
    NotificationType,
    type TypeSettings,
    type TypeSettingsMap,
    type DeadlineTypeSettings,
    type DeadlineIntervals,
    type SettingsJson,
} from './types';

const ALL_CHANNELS: NotificationChannel[] = [
    NotificationChannel.PUSH,
    NotificationChannel.WEBSOCKET
];

/**
 * Manages user notification preferences.
 * Opt-out model: undefined = enabled.
 *
 * Priority:
 *   1. projects[goalId][type] — highest
 *   2. global[type] — fallback
 *   3. undefined — enabled
 */
export class UserPreferences {
    private data: SettingsJson;

    constructor(json: unknown) {
        this.data = (json && typeof json === 'object' ? json : {}) as SettingsJson;
    }

    getEnabledChannels(type: NotificationType, goalId?: number): NotificationChannel[] {
        const resolved = this.resolveTypeSettings(type, goalId);
        if (!resolved?.channels) return ALL_CHANNELS;
        return ALL_CHANNELS.filter((ch) => resolved.channels![ch] !== false);
    }

    isChannelEnabled(type: NotificationType, channel: NotificationChannel, goalId?: number): boolean {
        const resolved = this.resolveTypeSettings(type, goalId);
        return resolved?.channels?.[channel] !== false;
    }

    getDeadlineIntervals(goalId?: number): DeadlineIntervals | undefined {
        const resolved = this.resolveTypeSettings(NotificationType.DEADLINE, goalId) as DeadlineTypeSettings | undefined;
        return resolved?.intervals;
    }

    getEnabledDeadlineIntervals(goalId?: number): number[] {
        const intervals = this.getDeadlineIntervals(goalId);
        if (!intervals) return [0]; // default: notify at deadline
        return Object.entries(intervals)
            .filter(([, enabled]) => enabled !== false)
            .map(([minutes]) => Number(minutes));
    }

    getGlobalTypeSettings<T extends NotificationType>(type: T): TypeSettingsMap[T] | undefined {
        return this.data.global?.[type] as TypeSettingsMap[T] | undefined;
    }

    getProjectTypeSettings<T extends NotificationType>(goalId: number, type: T): TypeSettingsMap[T] | undefined {
        return this.data.projects?.[String(goalId)]?.[type] as TypeSettingsMap[T] | undefined;
    }

    setGlobalChannel(type: NotificationType, channel: NotificationChannel, enabled: boolean): void {
        if (!this.data.global) this.data.global = {};
        if (!this.data.global[type]) this.data.global[type] = {} as TypeSettingsMap[typeof type];
        if (!this.data.global[type]!.channels) this.data.global[type]!.channels = {};
        this.data.global[type]!.channels![channel] = enabled;
    }

    setDeadlineIntervals(intervals: DeadlineIntervals, goalId?: number): void {
        if (goalId !== undefined) {
            const key = String(goalId);
            if (!this.data.projects) this.data.projects = {};
            if (!this.data.projects[key]) this.data.projects[key] = {};
            if (!this.data.projects[key][NotificationType.DEADLINE]) this.data.projects[key][NotificationType.DEADLINE] = {};
            (this.data.projects[key][NotificationType.DEADLINE] as DeadlineTypeSettings).intervals = intervals;
        } else {
            if (!this.data.global) this.data.global = {};
            if (!this.data.global[NotificationType.DEADLINE]) this.data.global[NotificationType.DEADLINE] = {};
            (this.data.global[NotificationType.DEADLINE] as DeadlineTypeSettings).intervals = intervals;
        }
    }

    setProjectChannel(goalId: number, type: NotificationType, channel: NotificationChannel, enabled: boolean): void {
        const key = String(goalId);
        if (!this.data.projects) this.data.projects = {};
        if (!this.data.projects[key]) this.data.projects[key] = {};
        if (!this.data.projects[key][type]) this.data.projects[key][type] = {} as TypeSettingsMap[typeof type];
        if (!this.data.projects[key][type]!.channels) this.data.projects[key][type]!.channels = {};
        this.data.projects[key][type]!.channels![channel] = enabled;
    }

    removeProjectSettings(goalId: number): void {
        delete this.data.projects?.[String(goalId)];
    }

    toJSON(): SettingsJson {
        return this.data;
    }

    private resolveTypeSettings(type: NotificationType, goalId?: number): TypeSettings | undefined {
        const globalSettings = this.data.global?.[type];

        if (goalId === undefined) return globalSettings;

        const projectSettings = this.data.projects?.[String(goalId)]?.[type];
        if (!projectSettings) return globalSettings;
        if (!globalSettings) return projectSettings;

        return {
            channels: { ...globalSettings.channels, ...projectSettings.channels },
            ...('intervals' in globalSettings || 'intervals' in projectSettings
                ? {
                    intervals: {
                        ...(globalSettings as DeadlineTypeSettings).intervals,
                        ...(projectSettings as DeadlineTypeSettings).intervals,
                    }
                }
                : {}
            ),
        };
    }
}
