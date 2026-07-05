export type MessagingProviderId = 'telegram' | 'slack';

export type MessagingOwnerType = 'user' | 'project' | 'organization';

export const MESSAGING_EVENTS = [
    'task.created',
    'task.assigned',
    'task.statusChanged',
    'task.completed',
    'task.edited',
    'task.addedToSprint',
    'task.deleted',
    'sprint.created',
    'sprint.updated',
    'sprint.started',
    'sprint.reviewStarted',
    'sprint.completed',
    'sprint.paused',
    'sprint.resumed',
    'sprint.deleted',
    'member.added',
    'member.removed',
    'member.rolesChanged',
    'time.started',
    'time.stopped',
    'time.logged',
    'time.updated',
    'time.deleted',
    'recurrence.created',
    'recurrence.updated',
    'recurrence.paused',
    'recurrence.resumed',
    'recurrence.ended',
    'recurrence.deleted',
    'recurrence.skipped',
] as const;
export type MessagingEvent = typeof MESSAGING_EVENTS[number];

export type MessagingConnectionItem = {
    id: number;
    provider: MessagingProviderId;
    ownerType: MessagingOwnerType;
    ownerId: number;
    targetChatId: string;
    title: string | null;
    externalTeamId: string | null;
    events: string[];
    postContent: boolean;
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;
};

export type MessagingConnectLinkResult = {
    provider: MessagingProviderId;
    url: string;
    token: string;
    expiresAt: string;
};

export type MessagingArgToggle = {
    id: number;
    isActive: boolean;
};

export type MessagingArgDelete = {
    id: number;
};

export type MessagingArgProjectToggle = {
    id: number;
    goalId: number;
    isActive: boolean;
};

export type MessagingArgProjectDelete = {
    id: number;
    goalId: number;
};
