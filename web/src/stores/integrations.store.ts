import { defineStore } from 'pinia'
import type { IntegrationArgAdd, IntegrationItem, RepoItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

interface IntegrationsStoreState {
  loading: boolean
  integrations: IntegrationItem[]
  repos: RepoItem[]
  reposLoading: boolean
}

export const useIntegrationsStore = defineStore('integrations', {
  state: (): IntegrationsStoreState => ({
    loading: false,
    integrations: [],
    repos: [],
    reposLoading: false,
  }),
  actions: {
    async fetchIntegrations(projectId: number): Promise<void> {
      if (this.loading) return
      this.loading = true
      const result = await $tvApi.integrations.fetchIntegrations(projectId)
      this.integrations = result || []
      this.loading = false
    },

    async addIntegration(data: IntegrationArgAdd): Promise<IntegrationItem | null> {
      const integration = await $tvApi.integrations.createIntegration(data)
      if (!integration) return null
      this.integrations.push(integration)
      return integration
    },

    async removeIntegration(id: number): Promise<void> {
      const result = await $tvApi.integrations.deleteIntegration(id)
      if (!result) return
      const index = this.integrations.findIndex((i) => i.id === id)
      if (index !== -1) {
        this.integrations.splice(index, 1)
      }
    },

    async toggleIntegration(id: number, isActive: boolean): Promise<void> {
      const result = await $tvApi.integrations.toggleIntegration({ id, isActive })
      if (!result) return
      const index = this.integrations.findIndex((i) => i.id === id)
      if (index !== -1) {
        this.integrations[index] = result
      }
    },

    async fetchRepos(integrationId: number): Promise<void> {
      this.reposLoading = true
      const result = await $tvApi.integrations.fetchRepos(integrationId)
      this.repos = result || []
      this.reposLoading = false
    },

    async syncIntegration(integrationId: number): Promise<boolean> {
      const result = await $tvApi.integrations.syncIntegration(integrationId)
      return !!(result && result.synced >= 0)
    },

    async selectRepo(integrationId: number, repo: RepoItem): Promise<void> {
      const result = await $tvApi.integrations.selectRepo({
        integrationId,
        repoFullName: repo.fullName,
        repoExternalId: String(repo.id),
      })
      if (!result) return
      const index = this.integrations.findIndex((i) => i.id === integrationId)
      if (index !== -1) {
        this.integrations[index] = result
      }
      this.repos = []
    },
  },
})
