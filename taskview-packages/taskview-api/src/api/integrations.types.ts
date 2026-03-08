export type IntegrationProvider = 'github' | 'gitlab';

export type IntegrationItem = {
    id: number;
    provider: IntegrationProvider;
    repoFullName: string | null;
    repoExternalId: string | null;
    projectId: number;
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;
};

export type IntegrationArgAdd = {
    provider: IntegrationProvider;
    repoFullName: string;
    projectId: number;
};

export type IntegrationArgDelete = {
    id: number;
};

export type IntegrationArgToggle = {
    id: number;
    isActive: boolean;
};

export type IntegrationArgSelectRepo = {
    integrationId: number;
    repoFullName: string;
    repoExternalId: string;
};

export type RepoItem = {
    id: number;
    fullName: string;
    name: string;
    isPrivate: boolean;
    description: string | null;
    url: string;
};

export type IntegrationResponseAdd = IntegrationItem | null;
export type IntegrationResponseFetch = IntegrationItem[];
export type IntegrationResponseToggle = IntegrationItem | null;
export type IntegrationResponseDelete = boolean;
export type IntegrationResponseSelectRepo = IntegrationItem | null;
export type IntegrationResponseRepos = RepoItem[];
export type IntegrationResponseSync = { synced: number };
