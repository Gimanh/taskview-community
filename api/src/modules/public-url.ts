import type { Request } from 'express';

export class PublicApiUrl {
    static configured(): string | null {
        const raw = process.env.API_PUBLIC_URL;
        if (!raw || !raw.trim()) return null;
        return raw.trim().replace(/\/+$/, '');
    }

    static base(req: Request): string {
        return PublicApiUrl.configured() ?? `${req.protocol}://${req.get('host')}`;
    }

    static validateOnStartup(): void {
        const raw = process.env.API_PUBLIC_URL;
        if (!raw || !raw.trim()) return;

        let parsed: URL;
        try {
            parsed = new URL(raw.trim());
        } catch {
            throw new Error(`API_PUBLIC_URL is not a valid URL: "${raw}"`);
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error(`API_PUBLIC_URL must be an http(s) URL, got: "${raw}"`);
        }
    }
}
