import type { Request, Response } from 'express';
import { ArkErrors } from 'arktype';
import AuthController from '../auth/AuthController';
import { AppUser } from '../../core/AppUser';
import { GoalPermissions } from '../../types/auth.types';
import { $logger } from '../../modules/logget';
import { MessagingManager } from './MessagingManager';
import { SlackInboundManager } from './SlackInboundManager';
import { SLACK_OAUTH_NONCE_COOKIE } from './config';
import {
    MessagingArkTypeConnectLink,
    MessagingArkTypeById,
    MessagingArkTypeToggle,
    MessagingArkTypeUpdateEvents,
    MessagingArkTypeProviderParam,
    MessagingArkTypeProjectToggle,
    MessagingArkTypeProjectDelete,
    MessagingArkTypeProjectPostContent,
} from './types';
import { getAuthorizedGoalId } from './middlewares/ProjectMessagingPermission';

export class MessagingController {
    private readonly manager = new MessagingManager();
    private readonly slackInbound = new SlackInboundManager();

    // Slash command (/task). Signature already verified by VerifySlackRequest.
    slackCommands = async (req: Request, res: Response) => {
        try {
            const reply = await this.slackInbound.handleSlashCommand(req.body ?? {});
            return res.json(reply);
        } catch (err) {
            $logger.error(err, '[Messaging/Slack] slash command failed');
            return res.json({ response_type: 'ephemeral', text: 'Something went wrong handling that command.' });
        }
    };

    // Button clicks and modal submissions. Payload is a JSON string in the `payload` field.
    slackInteractivity = async (req: Request, res: Response) => {
        try {
            const raw = (req.body as { payload?: unknown })?.payload;
            const interaction = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const result = await this.slackInbound.handleInteraction(interaction ?? {});
            return res.json(result ?? {});
        } catch (err) {
            $logger.error(err, '[Messaging/Slack] interactivity failed');
            return res.status(200).end();
        }
    };

    fetch = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.fetchPersonalConnections(userId);
        return res.tvJson(result);
    };

    connectLink = async (req: Request, res: Response) => {
        const data = MessagingArkTypeConnectLink({ ...req.params, ...req.query });
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.createPersonalConnectLink(userId, data.provider);
        if (!result) return res.status(503).end();
        return res.tvJson(result);
    };

    toggle = async (req: Request, res: Response) => {
        const data = MessagingArkTypeToggle(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.togglePersonal(data.id, userId, data.isActive);
        if (!result) return res.status(404).end();
        return res.tvJson(result);
    };

    delete = async (req: Request, res: Response) => {
        const data = MessagingArkTypeById(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.deletePersonal(data.id, userId);
        return res.tvJson(result);
    };

    updateEvents = async (req: Request, res: Response) => {
        const data = MessagingArkTypeUpdateEvents(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.updatePersonalEvents(data.id, userId, data.events);
        if (!result) return res.status(404).end();
        return res.tvJson(result);
    };

    fetchProject = async (_req: Request, res: Response) => {
        const result = await this.manager.fetchProjectConnections(getAuthorizedGoalId(res));
        return res.tvJson(result);
    };

    projectConnectLink = async (req: Request, res: Response) => {
        const data = MessagingArkTypeProviderParam(req.params);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.createProjectConnectLink(getAuthorizedGoalId(res), userId, data.provider);
        if (!result) return res.status(503).end();
        return res.tvJson(result);
    };

    toggleProject = async (req: Request, res: Response) => {
        const data = MessagingArkTypeProjectToggle(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.toggleProject(data.id, getAuthorizedGoalId(res), data.isActive);
        if (!result) return res.status(404).end();
        return res.tvJson(result);
    };

    deleteProject = async (req: Request, res: Response) => {
        const data = MessagingArkTypeProjectDelete(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.deleteProject(data.id, getAuthorizedGoalId(res));
        return res.tvJson(result);
    };

    updateProjectEvents = async (req: Request, res: Response) => {
        const data = MessagingArkTypeUpdateEvents(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.updateProjectEvents(data.id, getAuthorizedGoalId(res), data.events);
        if (!result) return res.status(404).end();
        return res.tvJson(result);
    };

    updateProjectPostContent = async (req: Request, res: Response) => {
        const data = MessagingArkTypeProjectPostContent(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.updateProjectPostContent(data.id, getAuthorizedGoalId(res), data.postContent);
        if (!result) return res.status(404).end();
        return res.tvJson(result);
    };

    // Slack uses OAuth (browser redirect), so the user's JWT is passed as ?token and
    // validated manually — a full-page redirect can't carry the API Authorization header.
    slackOAuthStart = async (req: Request, res: Response) => {
        try {
            const token = req.query.token as string;
            if (!token) return res.status(401).send('token is required');

            const userPayload = await AuthController.validateTokens(token);
            const userId = userPayload?.userData?.id;
            if (!userId) return res.status(401).send('Invalid token');

            if (!this.manager.getProvider('slack')?.isConfigured()) {
                return res.status(503).send('Slack is not configured on the server (set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_CALLBACK_URL)');
            }

            const scope: 'user' | 'project' = req.query.scope === 'project' ? 'project' : 'user';
            let ownerId = userId;

            if (scope === 'project') {
                const goalId = Number(req.query.goalId);
                if (!goalId || Number.isNaN(goalId)) return res.status(400).send('goalId is required');
                const checker = await new AppUser(userPayload).permissionsFetcher.getCheckerForGoal(goalId);
                if (!checker.hasPermissions(GoalPermissions.INTEGRATIONS_CAN_MANAGE)) return res.status(403).end();
                ownerId = goalId;
            }

            const returnPath = this.safeReturnPath(req.query.returnPath);
            const start = await this.manager.startOAuthConnect('slack', { ownerType: scope, ownerId, userId, returnPath });
            if (!start) return res.status(503).send('Slack is not configured on the server');
            // The provider hands back the anti-CSRF nonce cookie to set on this browser.
            if (start.kind === 'oauth') {
                res.cookie(start.setCookie.name, start.setCookie.value, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: start.setCookie.maxAgeMs,
                });
            }
            return res.redirect(start.url);
        } catch (err) {
            $logger.error(err, '[Messaging/Slack] Failed to start OAuth');
            return res.status(500).send('Failed to start Slack OAuth');
        }
    };

    slackOAuthCallback = async (req: Request, res: Response) => {
        const code = req.query.code as string;
        const state = req.query.state as string;
        const nonce = req.cookies?.[SLACK_OAUTH_NONCE_COOKIE] as string | undefined;
        res.clearCookie(SLACK_OAUTH_NONCE_COOKIE);
        if (!code || !state) return res.redirect(`${process.env.APP_URL}?messaging=error`);
        try {
            const result = await this.manager.handleInbound('slack', { source: 'oauth-callback', payload: { code, state }, cookie: nonce });
            return res.redirect(`${process.env.APP_URL}${this.safeReturnPath(result?.redirect)}?messaging=connected`);
        } catch (err) {
            $logger.error({ error: err instanceof Error ? err.message : String(err), hasNonce: !!nonce }, '[Messaging/Slack] OAuth callback failed');
            return res.redirect(`${process.env.APP_URL}?messaging=error`);
        }
    };

    private safeReturnPath(value: unknown): string {
        return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
            ? value
            : '';
    }

    telegramWebhook = async (req: Request, res: Response) => {
        res.status(200).end();
        await this.manager.handleInbound('telegram', { source: 'webhook', payload: req.body });
    };
}
