import type { MessagingConnectionsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { MessagingEvent, MessagingOwnerType, MessagingProviderId } from './types';

export type MessagingConnectionForClient = Omit<MessagingConnectionsSchemaTypeForSelect, 'accessTokenEncrypted'>;

export interface MessagingRecipient {
    userId: number;
    email: string;
}

export interface SlackOpenModalArgs {
    botToken: string;
    triggerId: string;
    view: unknown;
}

export interface SlackOAuthAccessResponse {
    ok: boolean;
    error?: string;
    access_token?: string;
    team?: { id?: string; name?: string };
    authed_user?: { id?: string };
    incoming_webhook?: { url?: string; channel?: string; channel_id?: string };
}

export interface SlackSlashCommandPayload {
    user_id?: string;
    channel_id?: string;
    team_id?: string;
    text?: string;
}

export interface SlackInteractionPayload {
    type?: string;
    user?: { id?: string };
    team?: { id?: string };
    trigger_id?: string;
    response_url?: string;
    channel?: { id?: string };
    container?: { message_ts?: string };
    message?: { ts?: string; blocks?: { type?: string; text?: { text?: string } }[] };
    actions?: { action_id?: string; value?: string }[];
    view?: {
        callback_id?: string;
        private_metadata?: string;
        state?: { values?: Record<string, Record<string, { selected_options?: { value?: string }[] }>> };
    };
}

export interface SlackEphemeralReply {
    response_type: 'ephemeral';
    text: string;
}

export interface TelegramInboundMessage {
    text?: unknown;
    chat?: { id?: unknown; type?: unknown; title?: unknown };
    from?: { id?: unknown; username?: unknown };
}

export interface MessagingTaskContext {
    id: number;
    goalListId: number | null;
    description: string | null;
    complete: boolean;
}

export interface MessagingDispatchArgs {
    event: MessagingEvent;
    goalId: number;
    personalRecipients: MessagingRecipient[];
    initiatorId: number | null;
    /** Simple, non-content body (sprint name, member email, …). */
    body?: string;
    /** Task context: description is RBAC-gated per recipient (COMPONENT_CAN_WATCH_CONTENT) + a task deep-link. */
    task?: MessagingTaskContext;
    /** Overrides the title (e.g. "[Task reopened]" while still gated by the task.completed subscription). */
    titleOverride?: string;
}

/** Slack identities are keyed by workspace; Telegram passes externalTeamId = null. */
export interface MessagingIdentityUpsert {
    userId: number;
    provider: string;
    externalUserId: string;
    externalTeamId: string | null;
}

export interface MessagingIdentityLookup {
    provider: string;
    externalUserId: string;
    externalTeamId: string | null;
}

export interface MessagingChannelLookup {
    provider: string;
    channelId: string;
    externalTeamId: string | null;
}

export interface MessagingConnectionCreate {
    provider: MessagingProviderId;
    ownerType: MessagingOwnerType;
    ownerId: number;
    targetChatId: string;
    title: string | null;
    externalTeamId: string | null;
    accessTokenEncrypted: string | null;
}

export interface MessagingOwnedRef {
    id: number;
    ownerType: MessagingOwnerType;
    ownerId: number;
}

export interface MessagingOwnedToggle extends MessagingOwnedRef {
    isActive: boolean;
}

export interface MessagingLinkTokenCreate {
    token: string;
    provider: MessagingProviderId;
    ownerType: MessagingOwnerType;
    ownerId: number;
    createdBy: number;
    expiresAt: Date;
}

export interface SlackOAuthExchange {
    botToken: string;
    teamId: string | null;
    teamName: string | null;
    authedUserId: string | null;
    webhookUrl: string | null;
    webhookChannel: string | null;
    webhookChannelId: string | null;
}

export interface MessagingOAuthState {
    provider: MessagingProviderId;
    ownerType: MessagingOwnerType;
    ownerId: number;
    userId: number;
    /** SHA-256 of a nonce also stored in an httpOnly cookie — binds the flow to the initiating browser (anti-CSRF). */
    nonceHash: string;
    /** In-app path the user started from, to return them there after the callback. */
    returnPath: string;
}

export interface MessagingConnectLinkResult {
    provider: MessagingProviderId;
    url: string;
    token: string;
    expiresAt: string;
}

// ── Provider lifecycle (single MessagingProvider interface) ─────────────────
// Everything a provider needs to start a connection. The manager stays generic:
// it never branches on provider — it just persists what the provider returns.

export interface ConnectContext {
    ownerType: MessagingOwnerType;
    ownerId: number;
    userId: number;
    /** In-app path to return to after an OAuth round-trip (Slack); ignored by others. */
    returnPath?: string;
}

// Discriminated so the two flows can't be mixed up: a deep-link provider always mints a
// token to persist; an OAuth provider always sets an anti-CSRF cookie. Never both.
export type ConnectStart =
    | { kind: 'deep-link'; url: string; persistToken: { token: string; expiresAt: Date } }
    | { kind: 'oauth'; url: string; setCookie: { name: string; value: string; maxAgeMs: number } };

/** Raw inbound, tagged by which endpoint received it so the provider can parse accordingly. */
export interface InboundRaw {
    source: 'oauth-callback' | 'webhook';
    payload: unknown;
    /** Cookie value echoed back for verification (OAuth nonce). */
    cookie?: string;
}

/** Normalized inbound outcome. The provider parses protocol; the manager does DB + RBAC. */
export type InboundIntent =
    | {
        kind: 'createConnection';
        connection: MessagingConnectionCreate;
        /** Personal connections also link the messenger account to a TaskView user. */
        identity?: { userId: number; externalUserId: string; externalTeamId: string | null };
        /** In-app path to redirect the browser to (OAuth callback). */
        redirect?: string;
    }
    | {
        kind: 'bindByToken';
        token: string;
        scope: MessagingOwnerType;
        chatId: string;
        externalUserId: string;
        title: string | null;
    }
    | {
        /** A command from a chat (e.g. Telegram /task). The manager resolves identity + RBAC. */
        kind: 'command';
        command: 'createTask';
        text: string;
        chatId: string;
        externalUserId: string;
    };
