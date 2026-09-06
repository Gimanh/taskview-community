import type { Task } from './tasks.api.types';

export type StartScreenUsers = {
    id: number;
    name: string;
    users: { id: number; email: string }[];
}[];

export type StartScreenAssignees = {
    taskId: Task['id'];
    collabUserId: number;
    email: string;
}[];

/** Everything the main screen shows, split server-side in the caller's timezone. */
export type StartScreenState = {
    tasks: Task[];
    tasksToday: Task[];
    tasksUpcoming: Task[];
    tasksLastCompleted: Task[];
    users: StartScreenUsers;
    assignees: StartScreenAssignees;
    listToGoal: Record<number, number>;
};

export type StartStateArgs = {
    /** IANA timezone, e.g. "Europe/Belgrade". The API rejects the request without it. */
    tz: string;
    organizationId?: number;
};
