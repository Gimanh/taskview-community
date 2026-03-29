export type ApiTokenItem = {
    id: number;
    userId: number;
    name: string;
    allowedPermissions: string[];
    allowedGoalIds: number[];
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string | null;
};

export type ApiTokenCreateResponse = {
    token: string;
    item: ApiTokenItem;
};

export type ApiTokenArgCreate = {
    name: string;
    allowedPermissions?: string[];
    allowedGoalIds?: number[];
    expiresAt?: string | null;
};

export type ApiTokenPermission = {
    id: number;
    name: string;
    description: string;
    permissionGroup: number;
};
