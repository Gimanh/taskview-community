export const OUTBOUND_URL_ERROR_CODES = ['invalid', 'scheme', 'private', 'unresolvable'] as const;
export type OutboundUrlErrorCode = (typeof OUTBOUND_URL_ERROR_CODES)[number];

export type OutboundUrlArgs = {
    url: string;
    // Self-hosted opt-out per feature (WEBHOOKS_ALLOW_PRIVATE_URLS, SSO_ALLOW_PRIVATE_URLS)
    allowPrivate: boolean;
};
