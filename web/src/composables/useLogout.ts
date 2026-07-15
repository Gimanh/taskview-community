import { Capacitor } from '@capacitor/core'
import { WidgetBridge } from 'capacitor-widget-bridge'
import $api from '@/helpers/axios'
import { $ls, $tvApi } from '@/plugins/axios'
import { resetAccountStores } from '@/plugins/pinia'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { useOrganizationStore } from '@/stores/organization.store'

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
    if (Capacitor.isNativePlatform()) {
      await WidgetBridge.clearSnapshot().catch((err) => {
        console.error('[Logout] Failed to clear widget snapshot:', err)
      })
    }
    await $ls.invalidateTokens()
    useOrganizationStore().setCurrentOrg(null)
    resetAccountStores()
    return true
  }

  return false
}
