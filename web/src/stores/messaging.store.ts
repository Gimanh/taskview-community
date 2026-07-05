import { defineStore } from 'pinia'
import type { MessagingConnectionItem, MessagingConnectLinkResult, MessagingProviderId } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

interface MessagingStoreState {
  personal: MessagingConnectionItem[]
  project: MessagingConnectionItem[]
  personalLoading: boolean
  projectLoading: boolean
}

export const useMessagingStore = defineStore('messaging', {
  state: (): MessagingStoreState => ({
    personal: [],
    project: [],
    personalLoading: false,
    projectLoading: false,
  }),
  actions: {
    async fetchPersonal(): Promise<void> {
      if (this.personalLoading) return
      this.personalLoading = true
      try {
        this.personal = (await $tvApi.messaging.fetch()) || []
      } finally {
        this.personalLoading = false
      }
    },

    async connectPersonal(provider: MessagingProviderId): Promise<MessagingConnectLinkResult | null> {
      return await $tvApi.messaging.connectLink(provider)
    },

    async togglePersonal(id: number, isActive: boolean): Promise<void> {
      const result = await $tvApi.messaging.toggle({ id, isActive })
      if (!result) return
      const index = this.personal.findIndex((c) => c.id === id)
      if (index !== -1) this.personal[index] = result
    },

    async deletePersonal(id: number): Promise<void> {
      const ok = await $tvApi.messaging.delete({ id })
      if (!ok) return
      this.personal = this.personal.filter((c) => c.id !== id)
    },

    async updatePersonalEvents(id: number, events: string[]): Promise<void> {
      const result = await $tvApi.messaging.updateEvents({ id, events })
      if (!result) return
      const index = this.personal.findIndex((c) => c.id === id)
      if (index !== -1) this.personal[index] = result
    },

    async fetchProject(goalId: number): Promise<void> {
      if (this.projectLoading) return
      this.projectLoading = true
      try {
        this.project = (await $tvApi.messaging.fetchProject(goalId)) || []
      } finally {
        this.projectLoading = false
      }
    },

    async connectProject(provider: MessagingProviderId, goalId: number): Promise<MessagingConnectLinkResult | null> {
      return await $tvApi.messaging.projectConnectLink(provider, goalId)
    },

    async toggleProject(id: number, goalId: number, isActive: boolean): Promise<void> {
      const result = await $tvApi.messaging.toggleProject({ id, goalId, isActive })
      if (!result) return
      const index = this.project.findIndex((c) => c.id === id)
      if (index !== -1) this.project[index] = result
    },

    async deleteProject(id: number, goalId: number): Promise<void> {
      const ok = await $tvApi.messaging.deleteProject({ id, goalId })
      if (!ok) return
      this.project = this.project.filter((c) => c.id !== id)
    },

    async updateProjectEvents(id: number, goalId: number, events: string[]): Promise<void> {
      const result = await $tvApi.messaging.updateProjectEvents({ id, goalId, events })
      if (!result) return
      const index = this.project.findIndex((c) => c.id === id)
      if (index !== -1) this.project[index] = result
    },

    async updateProjectPostContent(id: number, goalId: number, postContent: boolean): Promise<void> {
      const result = await $tvApi.messaging.updateProjectPostContent({ id, goalId, postContent })
      if (!result) return
      const index = this.project.findIndex((c) => c.id === id)
      if (index !== -1) this.project[index] = result
    },
  },
})
