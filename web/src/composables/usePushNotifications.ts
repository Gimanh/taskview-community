import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { $tvApi } from '@/plugins/axios'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useRouter } from 'vue-router'
import { ALL_TASKS_LIST_ID } from 'taskview-api'

const registered = ref(false)
let initialized = false

export function usePushNotifications() {
  const supported = Capacitor.isNativePlatform()
  const router = useRouter()

  async function init() {
    console.log('-------------------------------- init push notifications --------------------------------')
    if (initialized || !supported) return
    initialized = true

    const permission = await FirebaseMessaging.requestPermissions()
    if (permission.receive !== 'granted') return

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const { token } = await FirebaseMessaging.getToken()
    if (token) {
      const platform = Capacitor.getPlatform() as 'android' | 'ios'
      await $tvApi.notifications.registerDevice(token, platform, timezone)
      registered.value = true
    }

    FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
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
        router.push({
          name: 'user',
          params: {
            projectId: data.goalId,
            listId: data.goalListId || ALL_TASKS_LIST_ID,
            taskId: data.taskId,
          },
        })
      }
    })
  }

  return { supported, registered, init }
}
