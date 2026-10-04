import type { OutboundUrlErrorCode } from './outbound-url.types';

export class OutboundUrlError extends Error {
    readonly code: OutboundUrlErrorCode;

    constructor(code: OutboundUrlErrorCode, message: string) {
        super(message);
        this.name = 'OutboundUrlError';
        this.code = code;
    }
}
