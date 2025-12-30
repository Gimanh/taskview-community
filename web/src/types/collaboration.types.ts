import type { CollaborationResponseFetchAllUsers } from 'taskview-api';

export type CollaborationUsers = CollaborationResponseFetchAllUsers[];

export type CollaborationStore = {
    users: CollaborationUsers;
};
