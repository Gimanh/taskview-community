import { defineStore } from 'pinia'
import type { WebhookItem, WebhookDeliveryItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

interface WebhooksStoreState {
  webhooks: WebhookItem[]
  deliveries: WebhookDeliveryItem[]
  loading: boolean
  deliveriesLoading: boolean
}

export const useWebhooksStore = defineStore('webhooks', {
  state: (): WebhooksStoreState => ({
    webhooks: [],
    deliveries: [],
    loading: false,
    deliveriesLoading: false,
  }),
  actions: {
    async fetchWebhooks(goalId: number): Promise<void> {
      if (this.loading) return
      this.loading = true
      const result = await $tvApi.webhooks.fetch(goalId)
      this.webhooks = result || []
      this.loading = false
    },

    async createWebhook(data: { goalId: number; url: string; events: string[] }): Promise<{ webhook: WebhookItem; secret: string } | null> {
      const result = await $tvApi.webhooks.create(data)
      if (!result) return null
      this.webhooks.push(result.webhook)
      return result
    },

    async updateWebhook(data: { id: number; url?: string; events?: string[]; isActive?: boolean }): Promise<void> {
      const result = await $tvApi.webhooks.update(data)
      if (!result) return
      const index = this.webhooks.findIndex((w) => w.id === data.id)
      if (index !== -1) {
        this.webhooks[index] = result
      }
    },

    async deleteWebhook(id: number): Promise<void> {
      const result = await $tvApi.webhooks.delete({ id })
      if (!result) return
      const index = this.webhooks.findIndex((w) => w.id === id)
      if (index !== -1) {
        this.webhooks.splice(index, 1)
      }
    },

    async rotateSecret(id: number): Promise<string | null> {
      const result = await $tvApi.webhooks.rotateSecret(id)
      return result?.secret ?? null
    },

    async testDelivery(id: number): Promise<{ success: boolean; responseCode?: number } | null> {
      return await $tvApi.webhooks.testDelivery(id)
    },

    async fetchDeliveries(webhookId: number, options?: { cursor?: number; status?: string; append?: boolean }): Promise<void> {
      this.deliveriesLoading = true
      const result = await $tvApi.webhooks.fetchDeliveries(webhookId, {
        cursor: options?.cursor,
        status: options?.status,
      })
      if (options?.append) {
        this.deliveries.push(...(result || []))
      } else {
        this.deliveries = result || []
      }
      this.deliveriesLoading = false
    },

    async retryDelivery(deliveryId: number): Promise<{ success: boolean; responseCode?: number } | null> {
      return await $tvApi.webhooks.retryDelivery(deliveryId)
    },
  },
})
