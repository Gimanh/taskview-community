export class ImportCancelledError extends Error {
    constructor() {
        super('Import was cancelled');
        this.name = 'ImportCancelledError';
    }
}
