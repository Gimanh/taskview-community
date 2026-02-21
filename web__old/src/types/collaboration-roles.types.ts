import type { CollaborationPermission } from 'taskview-api';

export type CollaborationRole = {
    id: number;
    name: string;
    goal_id: number;
};

export type CollaborationRolesStore = {
    roles: CollaborationRole[];
    rolesPermissions: Record<CollaborationRole['id'], Record<CollaborationPermission['id'], true>>;
};
