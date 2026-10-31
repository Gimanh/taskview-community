import type { ImportRunErrorCode } from '../types';

export class ImportRunError extends Error {
    constructor(public readonly code: ImportRunErrorCode) {
        super(`Import failed: ${code}`);
        this.name = 'ImportRunError';
    }
}
