export enum NotificationType {
    DEADLINE = 'deadline',
    ASSIGN = 'assign',
    MENTION = 'mention',
    COMMENT = 'comment',
    STATUS_CHANGE = 'status_change',
}

export enum NotificationChannel {
    PUSH = 'push',
    WEBSOCKET = 'websocket',
    EMAIL = 'email',
}

export interface NotificationMessage {
    title: string;
    body: string;
}

/** 
 * Base settings — only channels (for instant notification types) 
 */
export interface BaseTypeSettings {
    channels?: Partial<Record<NotificationChannel, boolean>>;
}

/** 
 * Fixed intervals in minutes before deadline. 
 * Key = minutes, value = enabled. undefined = enabled (opt-out) 
 */
export interface DeadlineIntervals {
    0?: boolean;     // at deadline
    15?: boolean;    // 15 min before
    30?: boolean;    // 30 min before
    60?: boolean;    // 1 hour before
    1440?: boolean;  // 1 day before
}

/** 
 * Deadline has intervals (minutes before deadline to notify) 
 */
export interface DeadlineTypeSettings extends BaseTypeSettings {
    intervals?: DeadlineIntervals;
}

/** 
 * Instant types — only channels, no intervals 
 */
export type InstantTypeSettings = BaseTypeSettings;

/** 
 * Maps each notification type to its allowed settings shape 
 */
export interface TypeSettingsMap {
    [NotificationType.DEADLINE]: DeadlineTypeSettings;
    [NotificationType.ASSIGN]: InstantTypeSettings;
    [NotificationType.MENTION]: InstantTypeSettings;
    [NotificationType.COMMENT]: InstantTypeSettings;
    [NotificationType.STATUS_CHANGE]: InstantTypeSettings;
}

/** 
 * Union of all possible type settings (for generic use) 
 */
export type TypeSettings = DeadlineTypeSettings | InstantTypeSettings;

/**
 * @example
 * {
 *   "global": {
 *     "deadline": {
 *       "channels": { "push": true, "websocket": true, "email": false },
 *       "intervals": { "0": true, "15": true, "60": true, "1440": false }
 *     },
 *     "assign": {
 *       "channels": { "push": true, "websocket": true }
 *     },
 *     "mention": {
 *       "channels": { "push": false }
 *     }
 *   },
 *   "projects": {
 *     "42": {
 *       "deadline": {
 *         "channels": { "push": false },
 *         "intervals": { "0": true, "30": true }
 *       }
 *     }
 *   }
 * }
 *
 * Result for user with these settings:
 * - deadline globally: push + websocket, remind at 0/15/60 min before (1440 disabled)
 * - deadline in project 42: websocket only (push overridden), remind at 0/30 min before
 * - assign globally: push + websocket
 * - mention globally: websocket only (push explicitly disabled)
 * - comment: no settings → all channels enabled (opt-out)
 */
export interface SettingsJson {
    global?: { [K in NotificationType]?: TypeSettingsMap[K] };
    projects?: Record<string, { [K in NotificationType]?: TypeSettingsMap[K] }>;
}

export interface DeadlineJobData {
    taskId: number;
    description: string;
    goalId: number;
    goalListId: number | null;
    organizationId: number | null;
    endDate: string;
    endTime: string | null;
    initiatorId: number | null;
    immediate: boolean;
}

export interface TaskWithDeadline {
    id: number;
    description: string | null;
    goalId: number;
    goalListId: number | null;
    owner: number | null;
    endDate: string | null;
    endTime: string | null;
}