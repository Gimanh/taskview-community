import { defineStore } from 'pinia'
import type { ApiTokenItem, ApiTokenPermission } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

interface ApiTokensStoreState {
  tokens: ApiTokenItem[]
  permissions: ApiTokenPermission[]
  loading: boolean
}

export const useApiTokensStore = defineStore('apiTokens', {
  state: (): ApiTokensStoreState => ({
    tokens: [],
    permissions: [],
    loading: false,
  }),
  actions: {
    async fetchTokens(): Promise<void> {
      this.loading = true
      const result = await $tvApi.apiTokens.fetch()
      this.tokens = result || []
      this.loading = false
    },

    async createToken(data: { name: string; allowedPermissions?: string[]; allowedGoalIds?: number[]; expiresAt?: string | null }): Promise<{ token: string; item: ApiTokenItem } | null> {
      const result = await $tvApi.apiTokens.create(data)
      if (!result) return null
      this.tokens.push(result.item)
      return result
    },

    async deleteToken(id: number): Promise<void> {
      const result = await $tvApi.apiTokens.delete(id)
      if (!result) return
      const index = this.tokens.findIndex((t) => t.id === id)
      if (index !== -1) {
        this.tokens.splice(index, 1)
      }
    },

    async fetchPermissions(): Promise<void> {
      const result = await $tvApi.apiTokens.fetchPermissions()
      this.permissions = result || []
    },
  },
})
