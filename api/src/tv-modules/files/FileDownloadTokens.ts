import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FileDownloadTokenPayload } from './types';

export class FileDownloadTokens {
    private readonly secret: Buffer;

    constructor(secret: string | undefined = process.env.ENCRYPTION_KEY) {
        if (!secret || secret.length < 32) {
            throw new Error('ENCRYPTION_KEY must be set to sign file download tokens');
        }
        this.secret = Buffer.from(secret, 'utf8');
    }

    sign(payload: FileDownloadTokenPayload): string {
        const body = Buffer.from(`${payload.fileId}.${payload.inline ? 1 : 0}.${payload.exp}`).toString('base64url');
        return `${body}.${this.mac(body)}`;
    }

    verify(token: string, now: number = Math.floor(Date.now() / 1000)): FileDownloadTokenPayload | null {
        const dot = token.lastIndexOf('.');
        if (dot <= 0) return null;
        const body = token.slice(0, dot);
        const mac = token.slice(dot + 1);
        const expected = this.mac(body);
        if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

        const [fileId, inline, exp] = Buffer.from(body, 'base64url').toString('utf8').split('.');
        const expNumber = Number(exp);
        if (!fileId || !Number.isFinite(expNumber) || expNumber < now) return null;
        return { fileId, inline: inline === '1', exp: expNumber };
    }

    private mac(body: string): string {
        return createHmac('sha256', this.secret).update(body).digest('base64url');
    }
}
