import { createHash, randomBytes } from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { $logger } from '../../../modules/logget';
import { encrypt } from '../../../utils/crypto';
import type { MessagingProvider } from './MessagingProvider';
import type { MessagingDeliverArgs, MessagingDeliverResult, MessagingMessage, MessagingProviderId } from '../types';
import type { MessagingOwnerType } from '../types';
import { SLACK_ACTION_ASSIGN, SLACK_ACTION_DONE, SLACK_ACTION_REOPEN } from './slack.constants';
import type { ConnectContext, ConnectStart, InboundIntent, InboundRaw, MessagingOAuthState, SlackOAuthAccessResponse, SlackOAuthExchange, SlackOpenModalArgs } from '../types.internal';
import {
    OAUTH_NONCE_MAX_AGE_MS,
    OAUTH_STATE_TTL,
    SLACK_AUTHORIZE_URL,
    SLACK_OAUTH_NONCE_COOKIE,
    SLACK_POST_MESSAGE_URL,
    SLACK_TOKEN_URL,
    SLACK_VIEWS_OPEN_URL,
    SLACK_WEBHOOK_PREFIX,
} from '../config';
import { escapeSlackText, isSafeUrl } from '../utils';

/**
 * Slack provider. Bot credentials are instance-level (env), like GitHub/GitLab.
 * Personal connections DM the installing user (bot token + chat.postMessage);
 * project connections use an incoming webhook (channel chosen during install).
 */
export class SlackProvider implements MessagingProvider {
    readonly id: MessagingProviderId = 'slack';

    isConfigured(): boolean {
        return !!process.env.SLACK_CLIENT_ID && !!process.env.SLACK_CLIENT_SECRET && !!process.env.SLACK_CALLBACK_URL;
    }

    getOAuthUrl(state: string, ownerType: MessagingOwnerType): string {
        const clientId = process.env.SLACK_CLIENT_ID;
        const redirectUri = process.env.SLACK_CALLBACK_URL;
        if (!clientId || !redirectUri) {
            throw new Error('Slack integration OAuth is not configured');
        }
        // Personal → bot posts a DM to the installer. Project → channel is picked at
        // install via incoming-webhook, and chat:write lets us post + update messages
        // (chat.update) and open modals for the interactive buttons via the bot token.
        const scope = ownerType === 'project' ? 'incoming-webhook,chat:write' : 'chat:write';
        const params = new URLSearchParams({
            client_id: clientId,
            scope,
            redirect_uri: redirectUri,
            state,
        });
        return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
    }

    async exchangeCode(code: string): Promise<SlackOAuthExchange> {
        const redirectUri = process.env.SLACK_CALLBACK_URL;
        const res = await axios.post<SlackOAuthAccessResponse>(
            SLACK_TOKEN_URL,
            new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID ?? '',
                client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
                code,
                redirect_uri: redirectUri ?? '',
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );

        const data = res.data;
        if (!data.ok || !data.access_token) {
            throw new Error(`Slack code exchange failed: ${data.error ?? 'unknown'}`);
        }

        return {
            botToken: data.access_token,
            teamId: data.team?.id ?? null,
            teamName: data.team?.name ?? null,
            authedUserId: data.authed_user?.id ?? null,
            webhookUrl: data.incoming_webhook?.url ?? null,
            webhookChannel: data.incoming_webhook?.channel ?? null,
            webhookChannelId: data.incoming_webhook?.channel_id ?? null,
        };
    }

    async startConnect(ctx: ConnectContext): Promise<ConnectStart> {
        // Anti-CSRF: a nonce is set as a cookie on the initiating browser and its hash is
        // carried inside the signed state, verified on callback.
        const nonce = randomBytes(32).toString('hex');
        const state = jwt.sign(
            {
                provider: 'slack',
                ownerType: ctx.ownerType,
                ownerId: ctx.ownerId,
                userId: ctx.userId,
                nonceHash: this.hashNonce(nonce),
                returnPath: ctx.returnPath ?? '',
            } as MessagingOAuthState,
            process.env.JWT_SIGN as string,
            { expiresIn: OAUTH_STATE_TTL },
        );
        return {
            kind: 'oauth',
            url: this.getOAuthUrl(state, ctx.ownerType),
            setCookie: { name: SLACK_OAUTH_NONCE_COOKIE, value: nonce, maxAgeMs: OAUTH_NONCE_MAX_AGE_MS },
        };
    }

    async parseInbound(raw: InboundRaw): Promise<InboundIntent | null> {
        // Slash commands / interactivity are handled by SlackInboundManager (they need
        // multi-step Slack UI). Here we only complete the OAuth connect round-trip.
        if (raw.source !== 'oauth-callback') return null;
        const { code, state } = (raw.payload as { code?: string; state?: string }) ?? {};
        if (!code || !state) return null;

        const payload = jwt.verify(state, process.env.JWT_SIGN as string) as MessagingOAuthState;
        if (payload.provider !== 'slack') throw new Error('Provider mismatch in OAuth state');

        // The state's nonce hash must match the cookie set on the initiating browser.
        // Enforced only in production: local dev often splits the frontend (localhost) from
        // the public callback (tunnel), where a single browser cookie can't bridge origins.
        const nonceOk = !!raw.cookie && this.hashNonce(raw.cookie) === payload.nonceHash;
        if (!nonceOk) {
            if (process.env.NODE_ENV === 'production') throw new Error('OAuth state/nonce mismatch');
            $logger.warn('[Messaging/Slack] Skipping OAuth nonce check (non-production; split-origin dev)');
        }

        const ex = await this.exchangeCode(code);

        if (payload.ownerType === 'project') {
            if (!ex.webhookChannelId) throw new Error('Slack did not return the chosen channel');
            // Store the bot token (not the webhook URL): posting via chat.postMessage also
            // lets us update messages and open modals for the interactive buttons.
            return {
                kind: 'createConnection',
                redirect: payload.returnPath,
                connection: {
                    provider: 'slack',
                    ownerType: 'project',
                    ownerId: payload.ownerId,
                    targetChatId: ex.webhookChannelId,
                    title: ex.webhookChannel,
                    externalTeamId: ex.teamId,
                    accessTokenEncrypted: encrypt(ex.botToken),
                },
            };
        }

        if (!ex.authedUserId) throw new Error('Slack did not return the installing user');
        return {
            kind: 'createConnection',
            redirect: payload.returnPath,
            identity: { userId: payload.userId, externalUserId: ex.authedUserId, externalTeamId: ex.teamId ?? null },
            connection: {
                provider: 'slack',
                ownerType: 'user',
                ownerId: payload.userId,
                targetChatId: ex.authedUserId,
                title: ex.teamName ? `Slack (${ex.teamName})` : 'Slack',
                externalTeamId: ex.teamId,
                accessTokenEncrypted: encrypt(ex.botToken),
            },
        };
    }

    private hashNonce(nonce: string): string {
        return createHash('sha256').update(nonce).digest('hex');
    }

    async deliver(args: MessagingDeliverArgs): Promise<MessagingDeliverResult> {
        if (!args.accessToken) return { success: false };
        const secret = args.accessToken;
        const text = this.render(args.message);
        const blocks = this.buildTaskBlocks(args.message);

        try {
            // Legacy project connections store a webhook URL (no bot token → no interactive
            // buttons). Newer connections store a bot token and post via chat.postMessage.
            if (secret.startsWith(SLACK_WEBHOOK_PREFIX)) {
                const res = await axios.post(secret, { text, blocks }, { timeout: 10000 });
                return { success: res.status === 200 };
            }

            const res = await axios.post<{ ok: boolean; error?: string }>(
                SLACK_POST_MESSAGE_URL,
                { channel: args.chatId, text, blocks },
                { headers: { Authorization: `Bearer ${secret}` }, timeout: 10000 },
            );
            if (!res.data.ok) {
                $logger.warn(`[Messaging/Slack] chat.postMessage failed: ${res.data.error ?? 'unknown'} (channel=${args.chatId})`);
            }
            return { success: res.data.ok, errorCode: res.data.ok ? undefined : 400 };
        } catch (err) {
            // Never log the raw axios error — its config.url (incoming webhook, itself a
            // secret) / config.headers.Authorization (bot token) would land in disk logs.
            const status = (err as { response?: { status?: number } })?.response?.status;
            $logger.error({ status }, `[Messaging/Slack] Delivery failed to ${args.chatId}`);
            return { success: false };
        }
    }

    /** Opens a modal (assignee picker). trigger_id from the interaction expires in ~3s. */
    async openModal(args: SlackOpenModalArgs): Promise<boolean> {
        return this.callApi(SLACK_VIEWS_OPEN_URL, args.botToken, { trigger_id: args.triggerId, view: args.view });
    }

    /** Ephemeral feedback for an interaction — posts to the payload's response_url (no token). */
    async respondEphemeral(responseUrl: string, text: string): Promise<void> {
        // response_url is Slack-supplied; pin its host to the configured webhook host so a
        // trust regression can never turn this into an SSRF to an arbitrary URL.
        let host: string;
        try {
            host = new URL(responseUrl).host;
        } catch {
            return;
        }
        if (host !== new URL(SLACK_WEBHOOK_PREFIX).host) return;
        try {
            // replace_original:false — post a separate ephemeral note, never overwrite the card
            // the button was on (the response_url default is to replace the original message).
            await axios.post(responseUrl, { response_type: 'ephemeral', replace_original: false, text }, { timeout: 10000 });
        } catch {
            // Best-effort user feedback; nothing to recover if Slack's response_url is unreachable.
        }
    }

    private async callApi(url: string, botToken: string, body: Record<string, unknown>): Promise<boolean> {
        try {
            const res = await axios.post<{ ok: boolean; error?: string }>(url, body, {
                headers: { Authorization: `Bearer ${botToken}` },
                timeout: 10000,
            });
            if (!res.data.ok) $logger.warn(`[Messaging/Slack] ${url.split('/').pop()} failed: ${res.data.error ?? 'unknown'}`);
            return res.data.ok;
        } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            $logger.error({ status }, `[Messaging/Slack] API call failed: ${url.split('/').pop()}`);
            return false;
        }
    }

    // Block Kit: a text section plus Done/Assign action buttons for task events. The button
    // value carries the taskId so the interaction round-trips it back to us.
    private buildTaskBlocks(message: MessagingMessage): unknown[] {
        const url = message.url && isSafeUrl(message.url) ? message.url : undefined;
        const blocks: unknown[] = [];

        // Task name as a large header (Slack's biggest text). Header is plain_text only — no
        // link/markdown — so the clickable label lives in the section below.
        if (message.body) {
            blocks.push({ type: 'header', text: { type: 'plain_text', text: message.body.slice(0, 150), emoji: true } });
        }

        // Event + project label; the whole line links to the task.
        const label = escapeSlackText(message.title);
        blocks.push({ type: 'section', text: { type: 'mrkdwn', text: url ? `*<${url}|${label}>*` : `*${label}*` } });
        // Assignees line above the buttons so the actions sit at the very bottom.
        if (message.footer) {
            blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: escapeSlackText(message.footer) }] });
        }
        if (message.taskId && message.actions !== false) {
            // A completed task offers Reopen; an open task offers Done.
            const primary = message.completed
                ? { type: 'button', text: { type: 'plain_text', text: '↩️ Reopen' }, action_id: SLACK_ACTION_REOPEN, value: String(message.taskId) }
                : { type: 'button', text: { type: 'plain_text', text: '✅ Done' }, action_id: SLACK_ACTION_DONE, value: String(message.taskId) };
            blocks.push({
                type: 'actions',
                elements: [
                    primary,
                    { type: 'button', text: { type: 'plain_text', text: '👤 Assign' }, action_id: SLACK_ACTION_ASSIGN, value: String(message.taskId) },
                ],
            });
        }
        return blocks;
    }

    private render(message: MessagingMessage): string {
        const url = message.url && isSafeUrl(message.url) ? message.url : undefined;
        const lines: string[] = [];
        if (url) {
            // Slack link syntax <url|text>: hyperlink the description, or the title
            // when there is no description.
            lines.push(message.body
                ? `*${escapeSlackText(message.title)}*\n<${url}|${escapeSlackText(message.body)}>`
                : `*<${url}|${escapeSlackText(message.title)}>*`);
        } else {
            lines.push(`*${escapeSlackText(message.title)}*`);
            if (message.body) lines.push(escapeSlackText(message.body));
        }
        if (message.footer) lines.push(escapeSlackText(message.footer));
        return lines.join('\n');
    }
}
