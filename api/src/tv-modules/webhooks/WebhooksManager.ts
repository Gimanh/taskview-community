import { randomBytes, createHmac } from 'crypto';
import { encrypt, decrypt } from '../../utils/crypto';
import { $logger } from '../../modules/logget';
import { WebhooksRepository } from './WebhooksRepository';
import type { WebhookArgCreate, WebhookArgUpdate } from './types';
import type { WebhooksSchemaTypeForSelect } from 'taskview-db-schemas';

export type WebhookForClient = Omit<WebhooksSchemaTypeForSelect, 'secretEncrypted'>;

export class WebhooksManager {
    public readonly repository: WebhooksRepository;

    constructor() {
        this.repository = new WebhooksRepository();
    }

    async create(data: WebhookArgCreate): Promise<{ webhook: WebhookForClient; secret: string } | null> {
        const secret = randomBytes(32).toString('hex');
        const secretEncrypted = encrypt(secret);

        const webhook = await this.repository.create({
            goalId: data.goalId,
            url: data.url,
            secretEncrypted,
            events: data.events,
        });

        if (!webhook) return null;

        return { webhook: this.toClient(webhook), secret };
    }

    async update(data: WebhookArgUpdate): Promise<WebhookForClient | null> {
        const updateData: Partial<{ url: string; events: string[]; isActive: boolean }> = {};
        if (data.url !== undefined) updateData.url = data.url;
        if (data.events !== undefined) updateData.events = data.events;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const webhook = await this.repository.update(data.id, updateData);
        if (!webhook) return null;
        return this.toClient(webhook);
    }

    async delete(id: number): Promise<boolean> {
        return this.repository.delete(id);
    }

    async fetchByGoalId(goalId: number): Promise<WebhookForClient[]> {
        const webhooks = await this.repository.fetchByGoalId(goalId);
        return webhooks.map(w => this.toClient(w));
    }

    async rotateSecret(id: number): Promise<{ secret: string } | null> {
        const secret = randomBytes(32).toString('hex');
        const secretEncrypted = encrypt(secret);
        const success = await this.repository.updateSecret(id, secretEncrypted);
        if (!success) return null;
        return { secret };
    }

    async testDelivery(id: number): Promise<{ success: boolean; responseCode?: number }> {
        const webhook = await this.repository.fetchById(id);
        if (!webhook) return { success: false };

        const secret = decrypt(webhook.secretEncrypted);
        const payload = {
            event: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: { message: 'This is a test webhook delivery' },
        };

        return this.deliver(webhook.url, secret, payload);
    }

    async deliver(url: string, secret: string, payload: object): Promise<{ success: boolean; responseCode?: number }> {
        const body = JSON.stringify(payload);
        const signature = createHmac('sha256', secret).update(body).digest('hex');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': `sha256=${signature}`,
                },
                body,
                signal: AbortSignal.timeout(10000),
            });

            return { success: response.ok, responseCode: response.status };
        } catch (err) {
            $logger.error(err, `[Webhooks] Delivery failed to ${url}`);
            return { success: false };
        }
    }

    async retryDelivery(deliveryId: number): Promise<{ success: boolean; responseCode?: number }> {
        const deliveries = await this.repository.fetchDeliveryById(deliveryId);
        if (!deliveries) return { success: false };

        const webhook = await this.repository.fetchById(deliveries.webhookId);
        if (!webhook) return { success: false };

        const secret = decrypt(webhook.secretEncrypted);
        const result = await this.deliver(webhook.url, secret, deliveries.payload as object);

        await this.repository.updateDelivery(deliveryId, {
            status: result.success ? 'success' : 'failed',
            responseCode: result.responseCode,
            attempts: deliveries.attempts + 1,
        });

        return result;
    }

    async fetchDeliveries(webhookId: number, options?: { cursor?: number; status?: string }) {
        return this.repository.fetchDeliveries(webhookId, options);
    }

    private toClient(webhook: WebhooksSchemaTypeForSelect): WebhookForClient {
        const { secretEncrypted, ...rest } = webhook;
        return rest;
    }
}
