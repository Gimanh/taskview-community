export class FileStorageNotConfiguredError extends Error {
    readonly reason: string;

    constructor(reason: string) {
        super(`File storage is not configured: ${reason}`);
        this.name = 'FileStorageNotConfiguredError';
        this.reason = reason;
    }
}
