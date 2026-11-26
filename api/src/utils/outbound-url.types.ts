import type { RequestInit } from 'undici';

export const OUTBOUND_URL_ERROR_CODES = ['invalid', 'scheme', 'private', 'unresolvable'] as const;
export type OutboundUrlErrorCode = (typeof OUTBOUND_URL_ERROR_CODES)[number];

export type OutboundUrlArgs = {
    url: string;
    // Self-hosted opt-out per feature (WEBHOOKS_ALLOW_PRIVATE_URLS, SSO_ALLOW_PRIVATE_URLS, IMPORT_ALLOW_PRIVATE_URLS)
    allowPrivate: boolean;
};

export type PublicLookupArgs = {
    hostname: string;
    family?: number;
    hints?: number;
};

// Redirects are never followed: a Location header may name a literal private address, which no DNS guard sees
export type OutboundFetchInit = Omit<RequestInit, 'redirect' | 'dispatcher'> & {
    redirect: 'manual' | 'error';
};

export type OutboundFetchArgs = OutboundUrlArgs & {
    init: OutboundFetchInit;
};
