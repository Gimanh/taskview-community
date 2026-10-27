import jwt from 'jsonwebtoken';
import { $logger } from '../modules/logget';
import type { CentrifugoApiCall, CentrifugoBroadcastToUsersArgs } from '../types/centrifugo.types';

export class CentrifugoClient {
    private readonly apiUrl: string;
    private readonly apiKey: string;
    private readonly enabled: boolean;

    constructor() {
        const url = process.env.CENTRIFUGO_API_URL;
        const key = process.env.CENTRIFUGO_API_KEY;
        this.enabled = !!(url && key);
        this.apiUrl = url || '';
        this.apiKey = key || '';

        if (!this.enabled) {
            $logger.warn('[Centrifugo] Not configured — real-time notifications disabled');
        }
    }

    async publish(channel: string, data: Record<string, unknown>): Promise<boolean> {
        return this.call({ method: 'publish', payload: { channel, data } });
    }

    async broadcastToUsers(args: CentrifugoBroadcastToUsersArgs): Promise<boolean> {
        if (args.userIds.length === 0) return true;
        return this.call({
            method: 'broadcast',
            payload: { channels: args.userIds.map((id) => `personal:#${id}`), data: { event: args.event, ...args.data } },
        });
    }

    private async call(args: CentrifugoApiCall): Promise<boolean> {
        if (!this.enabled) return false;
        const { method, payload } = args;

        try {
            const response = await fetch(`${this.apiUrl}/api/${method}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `apikey ${this.apiKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                $logger.error({ status: response.status, method }, '[Centrifugo] Publish failed');
                return false;
            }

            return true;
        } catch (err) {
            $logger.error({ err, method }, '[Centrifugo] Publish error');
            return false;
        }
    }

    async publishToUser(userId: number, event: string, data: Record<string, unknown>): Promise<boolean> {
        return this.publish(`personal:#${userId}`, { event, ...data });
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    static generateConnectionToken(userId: number): string {
        const secret = process.env.CENTRIFUGO_TOKEN_SECRET || process.env.JWT_SIGN || '';
        return jwt.sign(
            { sub: String(userId) },
            secret,
            { expiresIn: '24h' }
        );
    }
}

let _instance: CentrifugoClient | null = null;

export function getCentrifugoClient(): CentrifugoClient {
    if (!_instance) {
        _instance = new CentrifugoClient();
    }
    return _instance;
}
