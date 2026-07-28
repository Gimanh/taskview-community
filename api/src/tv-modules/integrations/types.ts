import { type } from 'arktype';

export const IntegrationsArkTypeAdd = type({
    provider: "'github' | 'gitlab' | 'gitea'",
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

export type IntegrationProvider = 'github' | 'gitlab' | 'gitea';

export type OAuthStatePayload = {
    userId: number;
    projectId: number;
    provider: IntegrationProvider;
};

export type GiteaFetchIssuesArgs = {
    accessToken: string;
    repoFullName: string;
    since?: string;
};

export type GiteaCreateWebhookArgs = {
    accessToken: string;
    repoFullName: string;
    webhookUrl: string;
    secret: string;
};

export type GiteaVerifyWebhookSignatureArgs = {
    rawBody: Buffer;
    signature: string;
    secret: string;
};

export type GiteaUpdateIssueStateArgs = {
    accessToken: string;
    repoFullName: string;
    issueNumber: number;
    state: 'open' | 'closed';
};

export type IntegrationsDebugLogEntry = {
    step: string;
    data?: unknown;
};

export type RepoItemForClient = {
    id: number;
    fullName: string;
    name: string;
    isPrivate: boolean;
    description: string | null;
    url: string;
};
