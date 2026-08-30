import { defineStore } from 'pinia'
import type { OAuthConnectedApp, OAuthConsentRequest } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

interface OAuthStoreState {
  connectedApps: OAuthConnectedApp[]
  loading: boolean
  submitting: boolean
}

export const useOAuthStore = defineStore('oauth', {
  state: (): OAuthStoreState => ({
    connectedApps: [],
    loading: false,
    submitting: false,
  }),
  actions: {
    async fetchConnectedApps(): Promise<void> {
      this.loading = true
      const result = await $tvApi.oauth.fetchConnectedApps()
      this.connectedApps = result || []
      this.loading = false
    },

    async revokeConnectedApp(grantId: number): Promise<void> {
      const result = await $tvApi.oauth.revokeConnectedApp(grantId)
      if (!result) return
      const index = this.connectedApps.findIndex((app) => app.grantId === grantId)
      if (index !== -1) {
        this.connectedApps.splice(index, 1)
      }
    },

    async approveConsent(data: OAuthConsentRequest): Promise<string | null> {
      this.submitting = true
      const result = await $tvApi.oauth.approveConsent(data)
      this.submitting = false
      return result?.redirectUrl ?? null
    },

    async denyConsent(data: OAuthConsentRequest): Promise<string | null> {
      this.submitting = true
      const result = await $tvApi.oauth.denyConsent(data)
      this.submitting = false
      return result?.redirectUrl ?? null
    },
  },
})
