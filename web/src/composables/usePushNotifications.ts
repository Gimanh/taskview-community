import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { $tvApi } from '@/plugins/axios'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useRouter } from 'vue-router'
import { ALL_TASKS_LIST_ID } from 'taskview-api'

const registered = ref(false)
let initialized = false
let currentToken: string | null = null

export function usePushNotifications() {
  const supported = Capacitor.isNativePlatform()
  const router = useRouter()

  async function init() {
    console.log('-------------------------------- init push notifications --------------------------------')
    if (initialized || !supported) return
    initialized = true

    await FirebaseMessaging.removeAllListeners()

    const permission = await FirebaseMessaging.requestPermissions()
    if (permission.receive !== 'granted') return

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const { token } = await FirebaseMessaging.getToken()
    if (token) {
      currentToken = token
      const platform = Capacitor.getPlatform() as 'android' | 'ios'
      await $tvApi.notifications.registerDevice(token, platform, timezone)
      registered.value = true
    }

    FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
      currentToken = token
      const platform = Capacitor.getPlatform() as 'android' | 'ios'
      await $tvApi.notifications.registerDevice(token, platform, timezone)
      registered.value = true
    })

    FirebaseMessaging.addListener('notificationReceived', (_notification) => {
      const notificationsStore = useNotificationsStore()
      notificationsStore.fetchNotifications(true)
    })

    FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
      const data = action.notification.data as Record<string, string> | undefined
      if (data?.taskId && data?.goalId) {
        const orgStore = useOrganizationStore()
        if (data.organizationId) {
          const org = orgStore.organizations.find(o => o.id === Number(data.organizationId))
          if (org && org.id !== orgStore.currentOrg?.id) {
            orgStore.setCurrentOrg(org)
          }
        }
        router.push({
          name: 'user',
          params: {
            orgSlug: orgStore.currentOrgSlug,
            projectId: data.goalId,
            listId: data.goalListId || ALL_TASKS_LIST_ID,
            taskId: data.taskId,
          },
        })
      }
    })
  }

  function reset() {
    initialized = false
    registered.value = false
    currentToken = null
  }

  function getCurrentToken() {
    return currentToken
  }

  return { supported, registered, init, reset, getCurrentToken }
}
