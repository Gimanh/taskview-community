import $api from '@/helpers/axios'
import { $ls, $tvApi } from '@/plugins/axios'
import { usePushNotifications } from '@/composables/usePushNotifications'

export async function useLogout() {
  const { getCurrentToken, reset } = usePushNotifications()

  const deviceToken = getCurrentToken()
  if (deviceToken) {
    await $tvApi.notifications.unregisterDevice(deviceToken).catch((err) => {
      console.error('[Logout] Failed to unregister device token:', err)
    })
  }

  const result = await $api.post<{ logout: boolean }>('/module/auth/logout').catch((err) => {
    console.error(err, $api)
  })

  if (result) {
    reset()
    await $ls.invalidateTokens()
    return true
  }

  return false
}
