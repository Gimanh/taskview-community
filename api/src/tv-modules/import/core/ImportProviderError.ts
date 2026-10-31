import type { ImportProviderErrorCode } from './import-provider.types';

export class ImportProviderError extends Error {
    constructor(
        public readonly code: ImportProviderErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'ImportProviderError';
    }
}
