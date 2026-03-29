import { defineStore } from 'pinia'
import type { SessionItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

interface SessionsStoreState {
  sessions: SessionItem[]
  loading: boolean
}

export const useSessionsStore = defineStore('sessions', {
  state: (): SessionsStoreState => ({
    sessions: [],
    loading: false,
  }),
  actions: {
    async fetchSessions(): Promise<void> {
      this.loading = true
      this.sessions = []
      const result = await $tvApi.sessions.fetch()
      this.sessions = result || []
      this.loading = false
    },

    async deleteSession(id: number): Promise<void> {
      const result = await $tvApi.sessions.delete(id)
      if (!result) return
      const index = this.sessions.findIndex((s) => s.id === id)
      if (index !== -1) {
        this.sessions.splice(index, 1)
      }
    },

    async deleteAllSessions(): Promise<void> {
      const result = await $tvApi.sessions.deleteAll()
      if (!result) return
      this.sessions = this.sessions.filter((s) => s.isCurrent)
    },
  },
})
