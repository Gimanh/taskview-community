import { defineStore } from 'pinia'
import type { Notification } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { useOrganizationStore } from './organization.store'

interface NotificationsState {
  notifications: Notification[]
  loading: boolean
  hasMore: boolean
}

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    notifications: [],
    loading: false,
    hasMore: true,
  }),
  getters: {
    unreadCount: (state) => state.notifications.filter(n => !n.read).length,
  },
  actions: {
    async fetchNotifications(reset = false) {
      if (this.loading) return
      if (reset) {
        this.hasMore = true
      }

      this.loading = true
      try {
        const orgStore = useOrganizationStore()
        const cursor = reset ? undefined : this.notifications.at(-1)?.id
        const result = await $tvApi.notifications.fetch(cursor, orgStore.currentOrg?.id)
        if (result) {
          if (reset) {
            this.notifications = result.notifications
          } else {
            this.notifications.push(...result.notifications)
          }
          this.hasMore = result.notifications.length > 0
        }
      } finally {
        this.loading = false
      }
    },

    async markRead(notificationId: number) {
      const result = await $tvApi.notifications.markRead(notificationId)
      if (result) {
        const notification = this.notifications.find(n => n.id === notificationId)
        if (notification) {
          notification.read = true
        }
      }
    },

    async markAllRead() {
      const orgStore = useOrganizationStore()
      const result = await $tvApi.notifications.markAllRead(orgStore.currentOrg?.id)
      if (result) {
        this.notifications.forEach(n => { n.read = true })
      }
    },

    addRealtimeNotification(notification: Notification) {
      this.notifications.unshift(notification)
    },
  },
})
