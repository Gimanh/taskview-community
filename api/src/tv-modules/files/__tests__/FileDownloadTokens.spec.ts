import { describe, expect, it } from 'vitest';
import { FileDownloadTokens } from '../FileDownloadTokens';

const SECRET = 'x'.repeat(64);
const FILE_ID = '4c2a5c0e-8c3f-4a1e-9f0e-2c5b1d8e7a90';

describe('FileDownloadTokens', () => {
    it('round-trips a payload', () => {
        const tokens = new FileDownloadTokens(SECRET);
        const exp = Math.floor(Date.now() / 1000) + 60;
        const payload = tokens.verify(tokens.sign({ fileId: FILE_ID, inline: true, exp }));
        expect(payload).toEqual({ fileId: FILE_ID, inline: true, exp });
    });

    it('rejects an expired token', () => {
        const tokens = new FileDownloadTokens(SECRET);
        const token = tokens.sign({ fileId: FILE_ID, inline: false, exp: 1000 });
        expect(tokens.verify(token, 1001)).toBeNull();
        expect(tokens.verify(token, 999)).not.toBeNull();
    });

    it('rejects a tampered body and a token signed with another secret', () => {
        const tokens = new FileDownloadTokens(SECRET);
        const other = new FileDownloadTokens('y'.repeat(64));
        const exp = Math.floor(Date.now() / 1000) + 60;
        const token = tokens.sign({ fileId: FILE_ID, inline: false, exp });
        const [body, mac] = token.split('.');

        expect(tokens.verify(`${body.slice(0, -2)}AA.${mac}`)).toBeNull();
        expect(tokens.verify(other.sign({ fileId: FILE_ID, inline: false, exp }))).toBeNull();
        expect(tokens.verify('garbage')).toBeNull();
    });

    it('requires a secret', () => {
        expect(() => new FileDownloadTokens('')).toThrow('ENCRYPTION_KEY');
    });
});
