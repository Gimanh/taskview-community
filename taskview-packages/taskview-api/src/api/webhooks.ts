import TvApiBase from './base';
import type { AppResponse } from '@/api/base.types';
import type {
    WebhookArgCreate,
    WebhookArgDelete,
    WebhookArgUpdate,
    WebhookDeliveryItem,
    WebhookItem,
    WebhookResponseCreate,
} from './webhooks.types';

export default class TvWebhooks extends TvApiBase {
    protected moduleUrl = '/module/webhooks';

    public async fetch(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<WebhookItem[]>>(`${this.moduleUrl}`, { params: { goalId } })
        );
    }

    public async create(data: WebhookArgCreate) {
        return this.request(
            this.$axios.post<AppResponse<WebhookResponseCreate>>(`${this.moduleUrl}`, data)
        );
    }

    public async update(data: WebhookArgUpdate) {
        return this.request(
            this.$axios.patch<AppResponse<WebhookItem>>(`${this.moduleUrl}`, data)
        );
    }

    public async delete(data: WebhookArgDelete) {
        return this.request(
            this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}`, { data })
        );
    }

    public async rotateSecret(id: number) {
        return this.request(
            this.$axios.post<AppResponse<{ secret: string }>>(`${this.moduleUrl}/rotate-secret`, { id })
        );
    }

    public async testDelivery(id: number) {
        return this.request(
            this.$axios.post<AppResponse<{ success: boolean; responseCode?: number }>>(`${this.moduleUrl}/test`, { id })
        );
    }

    public async fetchDeliveries(webhookId: number, options?: { cursor?: number; status?: string }) {
        return this.request(
            this.$axios.get<AppResponse<WebhookDeliveryItem[]>>(`${this.moduleUrl}/deliveries/${webhookId}`, { params: options })
        );
    }

    public async retryDelivery(deliveryId: number) {
        return this.request(
            this.$axios.post<AppResponse<{ success: boolean; responseCode?: number }>>(`${this.moduleUrl}/retry`, { id: deliveryId })
        );
    }
}
