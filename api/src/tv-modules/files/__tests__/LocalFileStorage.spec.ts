import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalFileStorage } from '../storage/LocalFileStorage';

const read = async (stream: Readable) => Buffer.concat(await stream.toArray());

describe('LocalFileStorage', () => {
    let rootDir = '';
    let storage: LocalFileStorage;

    beforeEach(async () => {
        rootDir = await mkdtemp(join(tmpdir(), 'tv-files-'));
        storage = new LocalFileStorage({ type: 'local', rootDir });
    });

    afterEach(async () => {
        await rm(rootDir, { recursive: true, force: true });
    });

    it('stores, reads, checks and deletes an object by key', async () => {
        const stored = await storage.put({ key: '7/abc', stream: Readable.from([Buffer.from('payload')]), mimeType: 'text/plain' });
        expect(stored).toEqual({ key: '7/abc', sizeBytes: 7 });

        const got = await storage.get('7/abc');
        expect(got.sizeBytes).toBe(7);
        expect((await read(got.stream)).toString()).toBe('payload');
        expect(await storage.exists('7/abc')).toBe(true);

        await storage.delete('7/abc');
        expect(await storage.exists('7/abc')).toBe(false);
        await expect(storage.delete('7/abc')).resolves.toBeUndefined();
    });

    it('leaves no partial file behind when the source stream fails', async () => {
        const failing = new Readable({
            read() {
                this.push(Buffer.from('half'));
                this.destroy(new Error('boom'));
            },
        });
        await expect(storage.put({ key: '7/broken', stream: failing, mimeType: 'text/plain' })).rejects.toThrow('boom');
        expect(await storage.exists('7/broken')).toBe(false);
        expect(await readdir(join(rootDir, '7'))).toEqual([]);
    });

    it('refuses keys that escape the root directory', async () => {
        await expect(storage.get('../etc/passwd')).rejects.toThrow('escapes the root directory');
    });
});
