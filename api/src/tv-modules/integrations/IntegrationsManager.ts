import jwt from 'jsonwebtoken';
import type { AppUser } from '../../core/AppUser';
import { encrypt, decrypt } from '../../utils/crypto';

import { logError } from '../../utils/api';
import { $logger } from '../../modules/logget';

import { IntegrationsRepository } from './IntegrationsRepository';
import { TasksRepository } from '../tasks/TasksRepository';
import type { IntegrationsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { IntegrationProvider, IntegrationsArgAdd, IntegrationsArgDelete, IntegrationsArgFetch, IntegrationsArgSelectRepo, IntegrationsArgToggle, OAuthStatePayload, RepoItemForClient } from './types';
import { randomBytes } from 'crypto';
import { getGitHubOAuthUrl, exchangeGitHubCode, fetchGitHubRepos, fetchGitHubIssues, createGitHubWebhook, updateGitHubIssueState, GITHUB_BASE_URL } from './providers/github.provider';
import { getGitLabOAuthUrl, exchangeGitLabCode, fetchGitLabRepos, fetchGitLabIssues, createGitLabWebhook, updateGitLabIssueState, refreshGitLabToken, GITLAB_BASE_URL } from './providers/gitlab.provider';
import { getGiteaOAuthUrl, exchangeGiteaCode, fetchGiteaRepos, fetchGiteaIssues, createGiteaWebhook, updateGiteaIssueState, refreshGiteaToken, verifyGiteaToken, GITEA_BASE_URL } from './providers/gitea.provider';
import { integrationsDebugLog } from './debugLog';

export class IntegrationsManager {
    public readonly repository: IntegrationsRepository;
    private readonly user: AppUser;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new IntegrationsRepository();
    }

    async create(data: IntegrationsArgAdd): Promise<IntegrationsSchemaTypeForSelect | false> {
        return this.repository.create(data);
    }

    async delete(data: IntegrationsArgDelete): Promise<boolean> {
        return this.repository.delete(data);
    }

    async toggle(data: IntegrationsArgToggle): Promise<IntegrationsSchemaTypeForSelect | false> {
        const result = await this.repository.toggle(data);
        if (result && data.isActive) {
            this.syncIssues(data.id).catch(logError);
        }
        return result;
    }

    async fetch(data: IntegrationsArgFetch): Promise<IntegrationsSchemaTypeForSelect[]> {
        const projectId = Number(data.projectId);
        if (isNaN(projectId)) return [];
        return this.repository.fetchByProjectId(projectId);
    }

    getOAuthUrl(provider: string, projectId: number, userId: number): string {
        const state = jwt.sign(
            { userId, projectId, provider } as OAuthStatePayload,
            process.env.JWT_SIGN as string,
            { expiresIn: '10m' }
        );

        if (provider === 'github') {
            return getGitHubOAuthUrl(state);
        } else if (provider === 'gitlab') {
            return getGitLabOAuthUrl(state);
        } else if (provider === 'gitea') {
            return getGiteaOAuthUrl(state);
        }
        throw new Error(`Unknown provider: ${provider}`);
    }

    async handleOAuthCallback(provider: string, code: string, state: string): Promise<{ projectId: number; orgSlug: string }> {
        $logger.debug({ provider }, '[integrations] handleOAuthCallback start');
        const payload = jwt.verify(state, process.env.JWT_SIGN as string) as OAuthStatePayload;
        integrationsDebugLog({ step: 'callback:state-verified', data: { userId: payload.userId, projectId: payload.projectId, provider: payload.provider } });

        if (payload.provider !== provider) {
            $logger.error({ provider, payloadProvider: payload.provider }, '[integrations] provider mismatch in state');
            throw new Error('Provider mismatch in state');
        }

        const userLogin = await this.repository.fetchUserLogin(payload.userId);
        integrationsDebugLog({ step: 'callback:user-fetched', data: { userLogin } });
        if (!userLogin) {
            $logger.error({ userId: payload.userId }, '[integrations] user not found during OAuth callback');
            throw new Error('User not found');
        }

        let accessTokenEncrypted: string;
        let refreshTokenEncrypted: string | null = null;

        if (provider === 'github') {
            const accessToken = await exchangeGitHubCode(code);
            accessTokenEncrypted = encrypt(accessToken);
        } else if (provider === 'gitlab') {
            const tokens = await exchangeGitLabCode(code);
            accessTokenEncrypted = encrypt(tokens.accessToken);
            refreshTokenEncrypted = encrypt(tokens.refreshToken);
        } else if (provider === 'gitea') {
            const tokens = await exchangeGiteaCode(code);
            integrationsDebugLog({ step: 'callback:token-exchanged', data: { hasAccessToken: !!tokens.accessToken, hasRefreshToken: !!tokens.refreshToken } });
            accessTokenEncrypted = encrypt(tokens.accessToken);
            refreshTokenEncrypted = tokens.refreshToken ? encrypt(tokens.refreshToken) : null;
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }
        integrationsDebugLog({ step: 'callback:tokens-encrypted' });

        const created = await this.repository.createWithToken(
            provider as IntegrationProvider,
            payload.projectId,
            accessTokenEncrypted,
            refreshTokenEncrypted,
        );
        if (!created) {
            integrationsDebugLog({ step: 'callback:db-insert-failed' });
            throw new Error('Failed to store integration record');
        }
        integrationsDebugLog({ step: 'callback:integration-created', data: { integrationId: created.id } });

        // The app routes are /:orgSlug/:projectId/... — redirect must use the slug
        // of the project's organization, falling back to the user login for legacy
        // projects without an organization.
        const orgSlug = await this.repository.fetchProjectOrgSlug(payload.projectId) ?? userLogin;

        $logger.debug({ provider, projectId: payload.projectId, orgSlug }, '[integrations] OAuth callback completed');
        return { projectId: payload.projectId, orgSlug };
    }

    async fetchRepos(integrationId: number): Promise<RepoItemForClient[]> {
        const integration = await this.repository.fetchById(integrationId);
        if (!integration || !integration.accessTokenEncrypted) return [];

        const accessToken = await this.getAccessToken(integration);
        if (!accessToken) return [];

        if (integration.provider === 'github') {
            const repos = await fetchGitHubRepos(accessToken);
            return repos.map((r) => ({
                id: r.id,
                fullName: r.full_name,
                name: r.name,
                isPrivate: r.private,
                description: r.description,
                url: r.html_url,
            }));
        } else if (integration.provider === 'gitlab') {
            const repos = await fetchGitLabRepos(accessToken);
            return repos.map((r) => ({
                id: r.id,
                fullName: r.path_with_namespace,
                name: r.name,
                isPrivate: r.visibility === 'private',
                description: r.description,
                url: r.web_url,
            }));
        } else if (integration.provider === 'gitea') {
            const repos = await fetchGiteaRepos(accessToken);
            return repos.map((r) => ({
                id: r.id,
                fullName: r.full_name,
                name: r.name,
                isPrivate: r.private,
                description: r.description,
                url: r.html_url,
            }));
        }

        return [];
    }

    async selectRepo(data: IntegrationsArgSelectRepo): Promise<IntegrationsSchemaTypeForSelect | false> {
        const integration = await this.repository.fetchById(data.integrationId);
        if (!integration) return false;

        const exists = await this.repository.existsRepoInProject(integration.projectId, data.repoFullName, data.integrationId);
        if (exists) {
            $logger.debug({ integrationId: data.integrationId, repoFullName: data.repoFullName, projectId: integration.projectId }, '[integrations] repo already connected to project, skipping');
            return false;
        }

        const result = await this.repository.updateRepo(data);
        if (result) {
            $logger.debug({ integrationId: data.integrationId, repoFullName: data.repoFullName }, '[integrations] repo selected, starting sync and webhook registration');
            this.syncIssues(data.integrationId).catch(logError);
            this.registerWebhook(data.integrationId).catch(logError);
        }
        return result;
    }

    private async registerWebhook(integrationId: number): Promise<void> {
        const integration = await this.repository.fetchById(integrationId);
        if (!integration || !integration.accessTokenEncrypted || !integration.repoFullName) return;

        const apiUrl = process.env.API_URL;
        if (!apiUrl) return;

        const accessToken = await this.getAccessToken(integration);
        if (!accessToken) {
            $logger.error({ integrationId, provider: integration.provider }, '[integrations] registerWebhook failed: no access token');
            return;
        }

        const webhookSecret = randomBytes(32).toString('hex');
        const webhookUrl = `${apiUrl}/module/integrations/webhook/${integration.provider}`;

        let webhookId: string;

        if (integration.provider === 'github') {
            const result = await createGitHubWebhook(accessToken, integration.repoFullName, webhookUrl, webhookSecret);
            webhookId = String(result.id);
        } else if (integration.provider === 'gitlab' && integration.repoExternalId) {
            const result = await createGitLabWebhook(accessToken, Number(integration.repoExternalId), webhookUrl, webhookSecret);
            webhookId = String(result.id);
        } else if (integration.provider === 'gitea') {
            const result = await createGiteaWebhook({
                accessToken,
                repoFullName: integration.repoFullName,
                webhookUrl,
                secret: webhookSecret,
            });
            webhookId = String(result.id);
        } else {
            return;
        }

        $logger.debug({ integrationId, provider: integration.provider, webhookId }, '[integrations] webhook registered');
        await this.repository.updateWebhook(integrationId, webhookId, encrypt(webhookSecret));
    }

    async syncIssues(integrationId: number): Promise<number> {
        const integration = await this.repository.fetchById(integrationId);
        if (!integration || !integration.accessTokenEncrypted || !integration.repoFullName) return 0;

        const accessToken = await this.getAccessToken(integration);
        if (!accessToken) {
            $logger.error({ integrationId, provider: integration.provider }, '[integrations] syncIssues failed: no access token');
            return 0;
        }

        const since = integration.lastSyncedAt?.toISOString();
        $logger.debug({ integrationId, provider: integration.provider, repo: integration.repoFullName, since: since ?? 'full sync' }, '[integrations] syncIssues start');
        const existingMappings = await this.repository.fetchMappingsByIntegrationId(integrationId);
        const mappingsByIssueNumber = new Map(existingMappings.map((m) => [m.issueNumber, m]));

        const issueUrlPrefix = this.getIssueUrlPrefix(integration);

        // Backfill sourceUrl for existing tasks that don't have it yet
        if (existingMappings.length > 0) {
            await this.repository.backfillSourceUrls(integrationId, issueUrlPrefix).catch(logError);
        }

        type NewIssueItem = { goalId: number; description: string; integrationId: number; issueNumber: number; issueState: string; note: string | null; complete: boolean; kanbanOrder: number; sourceUrl: string | null };
        const newItems: NewIssueItem[] = [];

        if (integration.provider === 'github') {
            const issues = await fetchGitHubIssues(accessToken, integration.repoFullName, since);
            for (const issue of issues) {
                const existing = mappingsByIssueNumber.get(issue.number);
                if (existing) {
                    const isClosed = issue.state === 'closed';
                    const targetState = isClosed ? 'closed' : 'open';
                    await this.repository.updateTaskComplete(existing.taskId, isClosed).catch(logError);
                    if (existing.issueState !== targetState) {
                        await this.repository.updateMappingState(existing.id, targetState).catch(logError);
                    }
                    await this.repository.updateTaskTitleAndNote(existing.taskId, issue.title, issue.body ?? null).catch(logError);
                    await this.repository.updateTaskSourceUrl(existing.taskId, `${GITHUB_BASE_URL}/${integration.repoFullName}/issues/${issue.number}`).catch(logError);
                    continue;
                }
                newItems.push({
                    goalId: integration.projectId,
                    description: issue.title,
                    integrationId,
                    issueNumber: issue.number,
                    issueState: issue.state === 'open' ? 'open' : 'closed',
                    note: issue.body ?? null,
                    complete: issue.state === 'closed',
                    kanbanOrder: 0,
                    sourceUrl: `${GITHUB_BASE_URL}/${integration.repoFullName}/issues/${issue.number}`,
                });
            }
        } else if (integration.provider === 'gitlab' && integration.repoExternalId) {
            const issues = await fetchGitLabIssues(accessToken, Number(integration.repoExternalId), since);
            for (const issue of issues) {
                const existing = mappingsByIssueNumber.get(issue.iid);
                if (existing) {
                    const isClosed = issue.state === 'closed';
                    const targetState = isClosed ? 'closed' : 'open';
                    await this.repository.updateTaskComplete(existing.taskId, isClosed).catch(logError);
                    if (existing.issueState !== targetState) {
                        await this.repository.updateMappingState(existing.id, targetState).catch(logError);
                    }
                    await this.repository.updateTaskTitleAndNote(existing.taskId, issue.title, issue.description ?? null).catch(logError);
                    await this.repository.updateTaskSourceUrl(existing.taskId, `${GITLAB_BASE_URL}/${integration.repoFullName}/-/issues/${issue.iid}`).catch(logError);
                    continue;
                }
                const isClosed = issue.state === 'closed';
                newItems.push({
                    goalId: integration.projectId,
                    description: issue.title,
                    integrationId,
                    issueNumber: issue.iid,
                    issueState: isClosed ? 'closed' : 'open',
                    note: issue.description ?? null,
                    complete: isClosed,
                    kanbanOrder: 0,
                    sourceUrl: `${GITLAB_BASE_URL}/${integration.repoFullName}/-/issues/${issue.iid}`,
                });
            }
        } else if (integration.provider === 'gitea') {
            const issues = await fetchGiteaIssues({ accessToken, repoFullName: integration.repoFullName, since });
            for (const issue of issues) {
                const existing = mappingsByIssueNumber.get(issue.number);
                if (existing) {
                    const isClosed = issue.state === 'closed';
                    const targetState = isClosed ? 'closed' : 'open';
                    await this.repository.updateTaskComplete(existing.taskId, isClosed).catch(logError);
                    if (existing.issueState !== targetState) {
                        await this.repository.updateMappingState(existing.id, targetState).catch(logError);
                    }
                    await this.repository.updateTaskTitleAndNote(existing.taskId, issue.title, issue.body ?? null).catch(logError);
                    await this.repository.updateTaskSourceUrl(existing.taskId, `${issueUrlPrefix}${issue.number}`).catch(logError);
                    continue;
                }
                const isClosed = issue.state === 'closed';
                newItems.push({
                    goalId: integration.projectId,
                    description: issue.title,
                    integrationId,
                    issueNumber: issue.number,
                    issueState: isClosed ? 'closed' : 'open',
                    note: issue.body ?? null,
                    complete: isClosed,
                    kanbanOrder: 0,
                    sourceUrl: `${issueUrlPrefix}${issue.number}`,
                });
            }
        }

        // Issues come newest-first from API.
        // Reverse so oldest is inserted first (lower ID) and newest last (higher ID).
        // This way list view (ORDER BY id DESC) shows newest first.
        // Assign kanbanOrder so newest = smallest (appears first in kanban).
        // Issues come newest-first from API.
        // Reverse so oldest is inserted first (lower ID) and newest last (higher ID).
        // List view (ORDER BY id DESC) shows newest first.
        // Assign kanbanOrder: each next item goes further into minus from current min.
        // Newest (last in array) gets the smallest value → appears first in kanban.
        if (newItems.length > 0) {
            newItems.reverse();
            const { KANBAN_ORDER_GAP } = TasksRepository;
            const min = await this.user.tasksManager.repository.fetchTaskWithMinKanbanOrder(integration.projectId, null);
            for (let i = 0; i < newItems.length; i++) {
                newItems[i].kanbanOrder = (min ?? 0) - KANBAN_ORDER_GAP * (i + 1);
            }
        }

        const created = await this.repository.createTasksAndMappingsBatch(newItems);
        await this.repository.updateLastSyncedAt(integrationId);

        $logger.debug({ integrationId, created, updatedExisting: existingMappings.length, totalIssuesFetched: newItems.length + existingMappings.length }, '[integrations] syncIssues completed');
        return created;
    }

    async onTaskCompleteChanged(taskId: number, complete: boolean): Promise<boolean> {
        const mapping = await this.repository.fetchMappingByTaskId(taskId);
        if (!mapping) return true;

        const { integration } = mapping;
        $logger.debug({ taskId, complete, provider: integration.provider, isActive: integration.isActive, issueNumber: mapping.issueNumber, issueState: mapping.issueState }, '[integrations] onTaskCompleteChanged');
        if (!integration.isActive || !integration.accessTokenEncrypted || !integration.repoFullName) return true;

        const targetState = complete ? 'closed' : 'open';
        if (mapping.issueState === targetState) {
            $logger.debug({ taskId, targetState }, '[integrations] onTaskCompleteChanged: state already matches, skipping');
            return true;
        }

        const accessToken = await this.getAccessToken(integration);
        if (!accessToken) {
            $logger.error({ taskId, integrationId: integration.id, provider: integration.provider }, '[integrations] onTaskCompleteChanged: no access token');
            return false;
        }

        if (integration.provider === 'github') {
            await updateGitHubIssueState(accessToken, integration.repoFullName, mapping.issueNumber, targetState);
        } else if (integration.provider === 'gitlab' && integration.repoExternalId) {
            await updateGitLabIssueState(
                accessToken,
                Number(integration.repoExternalId),
                mapping.issueNumber,
                complete ? 'close' : 'reopen',
            );
        } else if (integration.provider === 'gitea') {
            await updateGiteaIssueState({
                accessToken,
                repoFullName: integration.repoFullName,
                issueNumber: mapping.issueNumber,
                state: targetState,
            });
        }

        await this.repository.updateMappingState(mapping.id, targetState);
        $logger.debug({ taskId, issueNumber: mapping.issueNumber, targetState }, '[integrations] onTaskCompleteChanged: issue state updated');
        return true;
    }

    private getIssueUrlPrefix(integration: IntegrationsSchemaTypeForSelect): string {
        if (integration.provider === 'gitlab') {
            return `${GITLAB_BASE_URL}/${integration.repoFullName}/-/issues/`;
        }
        const baseUrl = integration.provider === 'gitea' ? GITEA_BASE_URL : GITHUB_BASE_URL;
        return `${baseUrl}/${integration.repoFullName}/issues/`;
    }

    private async getAccessToken(integration: IntegrationsSchemaTypeForSelect): Promise<string | null> {
        if (!integration.accessTokenEncrypted) return null;

        const accessToken = decrypt(integration.accessTokenEncrypted);

        const hasExpiringToken = integration.provider === 'gitlab' || integration.provider === 'gitea';
        if (!hasExpiringToken || !integration.refreshTokenEncrypted) {
            return accessToken;
        }

        // Try the current token, refresh on 401
        try {
            if (integration.provider === 'gitea') {
                await verifyGiteaToken(accessToken);
            } else {
                const axios = (await import('axios')).default;
                const gitlabApiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
                await axios.get(`${gitlabApiUrl}/user`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
            }
            return accessToken;
        } catch (err: any) {
            if (err?.response?.status !== 401) return accessToken;
            $logger.debug({ integrationId: integration.id, provider: integration.provider }, '[integrations] token expired (401), refreshing');
        }

        // Token expired, refresh it
        try {
            const refreshToken = decrypt(integration.refreshTokenEncrypted);
            const tokens = integration.provider === 'gitea'
                ? await refreshGiteaToken(refreshToken)
                : await refreshGitLabToken(refreshToken);
            await this.repository.updateTokens(
                integration.id,
                encrypt(tokens.accessToken),
                encrypt(tokens.refreshToken),
            );
            $logger.debug({ integrationId: integration.id, provider: integration.provider }, '[integrations] token refreshed successfully');
            return tokens.accessToken;
        } catch (err) {
            $logger.error({ integrationId: integration.id, provider: integration.provider, err }, '[integrations] token refresh failed');
            return null;
        }
    }

}
