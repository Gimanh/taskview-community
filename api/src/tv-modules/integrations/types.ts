import { type } from 'arktype';
import type { Request } from 'express';
import type { AppUser } from '../../core/AppUser';

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

export const IntegrationProviderArkType = type("'github' | 'gitlab' | 'gitea'");
export type IntegrationProvider = typeof IntegrationProviderArkType.infer;

export const INTEGRATIONS_OAUTH_NONCE_COOKIE = 'tv_integrations_oauth';
export const INTEGRATIONS_OAUTH_NONCE_PATH = '/module/integrations/oauth';
export const INTEGRATIONS_OAUTH_STATE_TTL_SECONDS = 600;

export type OAuthStatePayload = {
    userId: number;
    projectId: number;
    provider: IntegrationProvider;
    nonceHash: string;
};

export type GetOAuthUrlArgs = {
    provider: IntegrationProvider;
    projectId: number;
    userId: number;
    nonce: string;
};

export type VerifyOAuthStateArgs = {
    provider: IntegrationProvider;
    state: string;
    nonce: string | undefined;
};

export type CompleteOAuthCallbackArgs = {
    provider: IntegrationProvider;
    code: string;
    payload: OAuthStatePayload;
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

export type CanManageIntegrationsArgs = {
    user: AppUser;
    projectId: number;
};

export type AppUserFromIdArgs = {
    req: Request;
    userId: number;
};
