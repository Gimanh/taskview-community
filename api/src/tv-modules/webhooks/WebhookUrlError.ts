import type { WebhookUrlErrorCode } from './types';

export class WebhookUrlError extends Error {
    constructor(
        public readonly code: WebhookUrlErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'WebhookUrlError';
    }
}
