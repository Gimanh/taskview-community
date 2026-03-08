import { type } from 'arktype';

export const IntegrationsArkTypeAdd = type({
    provider: "'github' | 'gitlab'",
    repoFullName: 'string',
    projectId: 'number',
});
export type IntegrationsArgAdd = typeof IntegrationsArkTypeAdd.infer;

export const IntegrationsArkTypeDelete = type({
    id: 'number',
});
export type IntegrationsArgDelete = typeof IntegrationsArkTypeDelete.infer;

export const IntegrationsArkTypeToggle = type({
    id: 'number',
    isActive: 'boolean',
});
export type IntegrationsArgToggle = typeof IntegrationsArkTypeToggle.infer;

export const IntegrationsArkTypeFetch = type({
    projectId: 'string',
});
export type IntegrationsArgFetch = typeof IntegrationsArkTypeFetch.infer;

export const IntegrationsArkTypeSelectRepo = type({
    integrationId: 'number',
    repoFullName: 'string',
    repoExternalId: 'string',
});
export type IntegrationsArgSelectRepo = typeof IntegrationsArkTypeSelectRepo.infer;

export type OAuthStatePayload = {
    userId: number;
    projectId: number;
    provider: 'github' | 'gitlab';
};

export type RepoItemForClient = {
    id: number;
    fullName: string;
    name: string;
    isPrivate: boolean;
    description: string | null;
    url: string;
};
