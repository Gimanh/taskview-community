import { promises as dns } from 'dns';
import { BlockList, isIP } from 'net';
import { WebhookUrlError } from './WebhookUrlError';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const BLOCKED_IPV4: Array<[string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
];

const BLOCKED_IPV6: Array<[string, number]> = [
    ['::', 128],
    ['::1', 128],
    ['64:ff9b::', 96],
    ['100::', 64],
    ['2001:db8::', 32],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
];

const blockList = new BlockList();
for (const [address, prefix] of BLOCKED_IPV4) blockList.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of BLOCKED_IPV6) blockList.addSubnet(address, prefix, 'ipv6');

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

export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 0) return false;
    return !blockList.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

function stripBrackets(hostname: string): string {
    return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function isLocalHostname(hostname: string): boolean {
    const normalized = hostname.replace(/\.$/, '');
    return normalized === 'localhost' || normalized.endsWith('.localhost');
}

export function parseWebhookUrl(url: string): URL {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new WebhookUrlError('invalid', 'Webhook URL is not a valid URL');
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        throw new WebhookUrlError('scheme', 'Webhook URL must use http or https');
    }

    if (!parsed.hostname) {
        throw new WebhookUrlError('invalid', 'Webhook URL must include a host');
    }

    if (isPrivateWebhookUrlsAllowed()) return parsed;

    const host = stripBrackets(parsed.hostname);
    if (isLocalHostname(host) || (isIP(host) !== 0 && !isPublicAddress(host))) {
        throw new WebhookUrlError('private', 'Webhook URL must point to a public address');
    }

    return parsed;
}

export async function resolveWebhookUrl(url: string): Promise<URL> {
    const parsed = parseWebhookUrl(url);
    if (isPrivateWebhookUrlsAllowed()) return parsed;

    const host = stripBrackets(parsed.hostname);
    if (isIP(host) !== 0) return parsed;

    let addresses: Array<{ address: string }>;
    try {
        addresses = await dns.lookup(host, { all: true });
    } catch {
        throw new WebhookUrlError('unresolvable', 'Webhook URL host could not be resolved');
    }

    if (addresses.length === 0) {
        throw new WebhookUrlError('unresolvable', 'Webhook URL host could not be resolved');
    }

    if (addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new WebhookUrlError('private', 'Webhook URL must point to a public address');
    }

    return parsed;
}
