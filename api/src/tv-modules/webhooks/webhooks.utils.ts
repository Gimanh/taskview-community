import { OutboundUrlError } from '../../utils/OutboundUrlError';
import { isPublicAddress, parseOutboundUrl, resolveOutboundUrl } from '../../utils/outbound-url';
import { WebhookUrlError } from './WebhookUrlError';

export { isPublicAddress };

export function isPrivateWebhookUrlsAllowed(): boolean {
    return process.env.WEBHOOKS_ALLOW_PRIVATE_URLS?.trim().toLowerCase() === 'true';
}

export function validateWebhooksEnvOnStartup(): void {
    const raw = process.env.WEBHOOKS_ALLOW_PRIVATE_URLS;
    if (raw === undefined || raw.trim() === '') return;
    const normalized = raw.trim().toLowerCase();
    if (normalized !== 'true' && normalized !== 'false') {
        throw new Error(`WEBHOOKS_ALLOW_PRIVATE_URLS has unrecognized value "${raw}". Allowed: true, false`);
    }
}

// The shared outbound URL guard, reported with the webhook-specific error the API already returns
function toWebhookError(err: unknown): unknown {
    return err instanceof OutboundUrlError ? new WebhookUrlError(err.code, `Webhook URL ${err.message}`) : err;
}

export function parseWebhookUrl(url: string): URL {
    try {
        return parseOutboundUrl({ url, allowPrivate: isPrivateWebhookUrlsAllowed() });
    } catch (err) {
        throw toWebhookError(err);
    }
}

export async function resolveWebhookUrl(url: string): Promise<URL> {
    try {
        return await resolveOutboundUrl({ url, allowPrivate: isPrivateWebhookUrlsAllowed() });
    } catch (err) {
        throw toWebhookError(err);
    }
}
