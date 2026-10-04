import { createHash } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { describe, expect, it } from 'vitest';
import { FileTooLargeError, HashingStream } from '../storage/HashingStream';

const sink = () => new Writable({ write(_chunk, _enc, cb) { cb(); } });

describe('HashingStream', () => {
    it('computes sha256 and counts bytes while passing data through', async () => {
        const payload = Buffer.from('hello files');
        const hashing = new HashingStream();
        await pipeline(Readable.from([payload.subarray(0, 5), payload.subarray(5)]), hashing, sink());

        expect(hashing.sizeBytes).toBe(payload.length);
        expect(hashing.digestHex()).toBe(createHash('sha256').update(payload).digest('hex'));
    });

    it('fails the pipeline once the limit is exceeded', async () => {
        const hashing = new HashingStream(4);
        await expect(pipeline(Readable.from([Buffer.from('12345')]), hashing, sink())).rejects.toBeInstanceOf(FileTooLargeError);
    });
});
