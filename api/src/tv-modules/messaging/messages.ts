import type { BuildMessagingMessageArgs, MessagingEvent, MessagingMessage } from './types';

type Audience = 'personal' | 'project';

// Delivered message titles. English on the server, matching NotificationMessages —
// the backend has no i18n/per-recipient locale, so notification text is English by
// convention. (The event-selection UI is localized separately via frontend i18n.)
// Personal wording is second-person where it differs from the project-channel wording.
const TITLES: Record<MessagingEvent, { personal: string; project: string }> = {
    'task.created': { personal: '[New task]', project: '[New task]' },
    'task.assigned': { personal: '[Task assigned to you]', project: '[Task assigned]' },
    'task.statusChanged': { personal: '[Task status changed]', project: '[Task status changed]' },
    'task.completed': { personal: '[Task completed]', project: '[Task completed]' },
    'task.edited': { personal: '[Task edited]', project: '[Task edited]' },
    'task.addedToSprint': { personal: '[Task added to sprint]', project: '[Task added to sprint]' },
    'task.deleted': { personal: '[Task deleted]', project: '[Task deleted]' },
    'sprint.created': { personal: '[Sprint created]', project: '[Sprint created]' },
    'sprint.updated': { personal: '[Sprint edited]', project: '[Sprint edited]' },
    'sprint.started': { personal: '[Sprint started]', project: '[Sprint started]' },
    'sprint.reviewStarted': { personal: '[Sprint review started]', project: '[Sprint review started]' },
    'sprint.completed': { personal: '[Sprint completed]', project: '[Sprint completed]' },
    'sprint.paused': { personal: '[Sprint paused]', project: '[Sprint paused]' },
    'sprint.resumed': { personal: '[Sprint resumed]', project: '[Sprint resumed]' },
    'sprint.deleted': { personal: '[Sprint deleted]', project: '[Sprint deleted]' },
    'member.added': { personal: '[Member added]', project: '[Member added]' },
    'member.removed': { personal: '[Member removed]', project: '[Member removed]' },
    'member.rolesChanged': { personal: '[Member roles changed]', project: '[Member roles changed]' },
    'time.started': { personal: '[Timer started]', project: '[Timer started]' },
    'time.stopped': { personal: '[Timer stopped]', project: '[Timer stopped]' },
    'time.logged': { personal: '[Time logged]', project: '[Time logged]' },
    'time.updated': { personal: '[Time entry edited]', project: '[Time entry edited]' },
    'time.deleted': { personal: '[Time entry deleted]', project: '[Time entry deleted]' },
    'recurrence.created': { personal: '[Recurrence created]', project: '[Recurrence created]' },
    'recurrence.updated': { personal: '[Recurrence edited]', project: '[Recurrence edited]' },
    'recurrence.paused': { personal: '[Recurrence paused]', project: '[Recurrence paused]' },
    'recurrence.resumed': { personal: '[Recurrence resumed]', project: '[Recurrence resumed]' },
    'recurrence.ended': { personal: '[Recurrence ended]', project: '[Recurrence ended]' },
    'recurrence.deleted': { personal: '[Recurrence deleted]', project: '[Recurrence deleted]' },
    'recurrence.skipped': { personal: '[Occurrence skipped]', project: '[Occurrence skipped]' },
};

export function buildMessagingMessage(args: BuildMessagingMessageArgs): MessagingMessage {
    const base = args.titleOverride ?? TITLES[args.event][args.audience];
    const title = args.projectName ? `${base} [${args.projectName}]` : base;
    return { event: args.event, title, body: args.body, url: args.url, taskId: args.taskId, footer: args.footer, completed: args.completed, actions: args.actions };
}
