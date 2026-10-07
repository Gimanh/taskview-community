import { createHash, type Hash } from 'node:crypto';
import { Transform, type TransformCallback } from 'node:stream';

export class HashingStream extends Transform {
    private readonly hash: Hash;
    private bytes = 0;
    private readonly maxBytes: number | null;

    constructor(maxBytes: number | null = null) {
        super();
        this.hash = createHash('sha256');
        this.maxBytes = maxBytes;
    }

    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
        this.bytes += chunk.length;
        if (this.maxBytes !== null && this.bytes > this.maxBytes) {
            callback(new FileTooLargeError(this.maxBytes));
            return;
        }
        this.hash.update(chunk);
        callback(null, chunk);
    }

    get sizeBytes(): number {
        return this.bytes;
    }

    digestHex(): string {
        return this.hash.digest('hex');
    }
}

export class FileTooLargeError extends Error {
    readonly maxBytes: number;

    constructor(maxBytes: number) {
        super(`File exceeds the limit of ${maxBytes} bytes`);
        this.name = 'FileTooLargeError';
        this.maxBytes = maxBytes;
    }
}
