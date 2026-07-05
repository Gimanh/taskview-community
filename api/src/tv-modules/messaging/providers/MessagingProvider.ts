import type { MessagingDeliverArgs, MessagingDeliverResult, MessagingProviderId } from '../types';
import type { ConnectContext, ConnectStart, InboundIntent, InboundRaw } from '../types.internal';

/**
 * Full contract for a messaging provider (Telegram, Slack, …). A provider owns its
 * protocol end-to-end — building connect URLs, exchanging OAuth codes, parsing inbound
 * payloads, calling the messenger API. It returns normalized data; the manager does the
 * business work (persistence, RBAC) and never branches on the concrete provider.
 */
export interface MessagingProvider {
    readonly id: MessagingProviderId;

    /** Whether this instance has the credentials needed to operate (env/admin config). */
    isConfigured(): boolean;

    /** Send one message to a chat/channel. Never throws — failures come back as a result. */
    deliver(args: MessagingDeliverArgs): Promise<MessagingDeliverResult>;

    /**
     * Everything needed to start connecting this owner: an authorize/deep-link URL, plus
     * optionally a token to persist (deep-link flows) or a cookie to set (OAuth anti-CSRF).
     */
    startConnect(ctx: ConnectContext): Promise<ConnectStart>;

    /** Parse a raw inbound payload (webhook / OAuth callback) into a normalized intent, or null. */
    parseInbound(raw: InboundRaw): Promise<InboundIntent | null>;
}
