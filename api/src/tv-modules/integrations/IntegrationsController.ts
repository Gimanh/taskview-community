import { type } from 'arktype';
import type { Request, Response } from 'express';
import { logError } from '../../utils/api';
import { decrypt } from '../../utils/crypto';
import AuthController from '../auth/AuthController';
import { IntegrationsRepository } from './IntegrationsRepository';
import { verifyGitHubWebhookSignature } from './providers/github.provider';
import { verifyGitLabWebhookToken } from './providers/gitlab.provider';
import { IntegrationsArkTypeAdd, IntegrationsArkTypeDelete, IntegrationsArkTypeFetch, IntegrationsArkTypeSelectRepo, IntegrationsArkTypeToggle } from './types';

export default class IntegrationsController {
    createIntegration = async (req: Request, res: Response) => {
        const out = IntegrationsArkTypeAdd(req.body);
        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }
        const result = await req.appUser.integrationsManager.create(out).catch(logError);
        return res.tvJson(result ?? null);
    };

    deleteIntegration = async (req: Request, res: Response) => {
        const out = IntegrationsArkTypeDelete(req.body);
        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }
        const result = await req.appUser.integrationsManager.delete(out).catch(logError);
        return res.tvJson(!!result);
    };

    toggleIntegration = async (req: Request, res: Response) => {
        const out = IntegrationsArkTypeToggle(req.body);
        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }
        const result = await req.appUser.integrationsManager.toggle(out).catch(logError);
        return res.tvJson(result ?? null);
    };

    fetchIntegrations = async (req: Request, res: Response) => {
        const out = IntegrationsArkTypeFetch(req.query);
        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }
        const result = await req.appUser.integrationsManager.fetch(out).catch(logError);
        return res.tvJson(result ?? []);
    };

    initiateOAuth = async (req: Request, res: Response) => {
        try {
            const token = req.query.token as string;
            if (!token) {
                return res.status(401).send('token is required');
            }
            const userPayload = await AuthController.validateTokens(token);
            if (!userPayload?.userData?.id) {
                return res.status(401).send('Invalid token');
            }

            const provider = req.params.provider;
            const projectId = Number(req.query.projectId);
            if (!projectId || isNaN(projectId)) {
                return res.status(400).send('projectId is required');
            }
            const url = req.appUser.integrationsManager.getOAuthUrl(provider, projectId, userPayload.userData.id);
            return res.redirect(url);
        } catch (err) {
            logError(err);
            return res.status(500).send('Failed to initiate OAuth');
        }
    };

    handleOAuthCallback = async (req: Request, res: Response) => {
        try {
            const provider = req.params.provider;
            const code = req.query.code as string;
            const state = req.query.state as string;

            if (!code || !state) {
                return res.redirect(`${process.env.APP_URL}?oauth=error`);
            }

            const { projectId, userLogin } = await req.appUser.integrationsManager.handleOAuthCallback(provider, code, state);
            return res.redirect(`${process.env.APP_URL}/${userLogin}/${projectId}/integrations?oauth=success`);
        } catch (err) {
            logError(err);
            return res.redirect(`${process.env.APP_URL}?oauth=error`);
        }
    };

    fetchRepos = async (req: Request, res: Response) => {
        try {
            const integrationId = Number(req.query.integrationId);
            if (!integrationId || isNaN(integrationId)) {
                return res.status(400).send('integrationId is required');
            }
            const repos = await req.appUser.integrationsManager.fetchRepos(integrationId);
            return res.tvJson(repos);
        } catch (err) {
            logError(err);
            return res.tvJson([]);
        }
    };

    selectRepo = async (req: Request, res: Response) => {
        const out = IntegrationsArkTypeSelectRepo(req.body);
        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }
        const result = await req.appUser.integrationsManager.selectRepo(out).catch(logError);
        return res.tvJson(result ?? null);
    };

    syncIntegration = async (req: Request, res: Response) => {
        try {
            const integrationId = Number(req.body.integrationId);
            if (!integrationId || isNaN(integrationId)) {
                return res.status(400).send('integrationId is required');
            }
            const synced = await req.appUser.integrationsManager.syncIssues(integrationId);
            return res.tvJson({ synced });
        } catch (err) {
            logError(err);
            return res.tvJson({ synced: 0 });
        }
    };

    handleGitHubWebhook = async (req: Request, res: Response) => {
        try {
            const signature = req.headers['x-hub-signature-256'] as string;
            const event = req.headers['x-github-event'] as string;

            if (!signature) {
                return res.status(401).send('Missing signature');
            }

            if (event !== 'issues') {
                return res.status(200).send('OK');
            }

            const repoFullName = req.body?.repository?.full_name;
            if (!repoFullName) {
                return res.status(400).send('Missing repository');
            }

            const repo = new IntegrationsRepository();
            const integrations = await repo.fetchAllActiveByRepoFullName(repoFullName);
            if (integrations.length === 0) {
                return res.status(404).send('Integration not found');
            }

            // Verify signature with the first integration that has a webhook secret
            const withSecret = integrations.find((i) => i.webhookSecretEncrypted);
            if (!withSecret) {
                return res.status(401).send('No webhook secret');
            }
            const secret = decrypt(withSecret.webhookSecretEncrypted!);
            const rawBody = (req as any).rawBody as Buffer;
            if (!rawBody || !verifyGitHubWebhookSignature(rawBody, signature, secret)) {
                return res.status(401).send('Invalid signature');
            }

            const action = req.body.action as string;
            const issue = req.body.issue;
            if (!issue) {
                return res.status(200).send('OK');
            }

            const issueNumber = issue.number as number;
            const issueTitle = issue.title as string;
            const issueBody = (issue.body as string) || null;

            for (const integration of integrations) {
                const mapping = await repo.fetchMappingByIssueNumber(integration.id, issueNumber);

                if (action === 'opened') {
                    if (!mapping) {
                        await repo.createTaskAndMapping(
                            integration.projectId,
                            issueTitle,
                            integration.id,
                            issueNumber,
                            'open',
                            issueBody,
                        );
                    }
                } else if (action === 'edited') {
                    if (mapping) {
                        await repo.updateTaskTitleAndNote(mapping.taskId, issueTitle, issueBody);
                    }
                } else if (action === 'closed') {
                    if (mapping) {
                        await repo.updateTaskComplete(mapping.taskId, true);
                        await repo.updateMappingState(mapping.id, 'closed');
                    }
                } else if (action === 'reopened') {
                    if (mapping) {
                        await repo.updateTaskComplete(mapping.taskId, false);
                        await repo.updateMappingState(mapping.id, 'open');
                    }
                }
            }

            return res.status(200).send('OK');
        } catch (err) {
            logError(err);
            return res.status(500).send('Webhook processing failed');
        }
    };

    handleGitLabWebhook = async (req: Request, res: Response) => {
        try {
            const token = req.headers['x-gitlab-token'] as string;

            if (!token) {
                return res.status(401).send('Missing token');
            }

            if (req.body?.object_kind !== 'issue') {
                return res.status(200).send('OK');
            }

            const projectId = String(req.body?.project?.id);
            if (!projectId) {
                return res.status(400).send('Missing project');
            }

            const repo = new IntegrationsRepository();
            const integrations = await repo.fetchAllActiveByRepoExternalId(projectId);
            if (integrations.length === 0) {
                return res.status(404).send('Integration not found');
            }

            // Verify token with the first integration that has a webhook secret
            const withSecret = integrations.find((i) => i.webhookSecretEncrypted);
            if (!withSecret) {
                return res.status(401).send('No webhook secret');
            }
            const secret = decrypt(withSecret.webhookSecretEncrypted!);
            if (!verifyGitLabWebhookToken(token, secret)) {
                return res.status(401).send('Invalid token');
            }

            const attrs = req.body.object_attributes;
            if (!attrs) {
                return res.status(200).send('OK');
            }

            const issueIid = attrs.iid as number;
            const issueTitle = attrs.title as string;
            const issueDescription = (attrs.description as string) || null;
            const action = attrs.action as string;

            for (const integration of integrations) {
                const mapping = await repo.fetchMappingByIssueNumber(integration.id, issueIid);

                if (action === 'open') {
                    if (!mapping) {
                        await repo.createTaskAndMapping(
                            integration.projectId,
                            issueTitle,
                            integration.id,
                            issueIid,
                            'open',
                            issueDescription,
                        );
                    }
                } else if (action === 'update') {
                    if (mapping) {
                        await repo.updateTaskTitleAndNote(mapping.taskId, issueTitle, issueDescription);
                    }
                } else if (action === 'close') {
                    if (mapping) {
                        await repo.updateTaskComplete(mapping.taskId, true);
                        await repo.updateMappingState(mapping.id, 'closed');
                    }
                } else if (action === 'reopen') {
                    if (mapping) {
                        await repo.updateTaskComplete(mapping.taskId, false);
                        await repo.updateMappingState(mapping.id, 'open');
                    }
                }
            }

            return res.status(200).send('OK');
        } catch (err) {
            logError(err);
            return res.status(500).send('Webhook processing failed');
        }
    };
}
