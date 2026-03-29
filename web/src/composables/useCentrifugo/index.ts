import { ref } from 'vue'
import { Centrifuge } from 'centrifuge'
import type { PublicationContext, Subscription } from 'centrifuge'
import { $tvApi } from '@/plugins/axios'
import { useUserStore } from '@/stores/user.store'
import { parseJwt } from '@/helpers/Helper'
import type { RealtimeEvent, RealtimeHandler } from './types'
import { eventHandlers } from './handlers'

let centrifuge: Centrifuge | null = null
let subscription: Subscription | null = null
let initialized = false

export function useCentrifugo() {
  const connected = ref(false)

  async function connect() {
    if (initialized) return

    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return

    try {
      const tokenResult = await $tvApi.notifications.getConnectionToken()
      if (!tokenResult?.token || !tokenResult?.url) return

      const parsed = parseJwt<{ sub: string }>(tokenResult.token)
      const userId = parsed?.sub
      if (!userId) return

      centrifuge = new Centrifuge(tokenResult.url, {
        token: tokenResult.token,
        getToken: async () => {
          const result = await $tvApi.notifications.getConnectionToken()
          return result?.token || ''
        },
      })

      centrifuge.on('connected', () => {
        connected.value = true
      })

      centrifuge.on('disconnected', () => {
        connected.value = false
      })

      subscription = centrifuge.newSubscription(`personal:#${userId}`)
      subscription.on('publication', (ctx: PublicationContext) => {
        const data = ctx.data as RealtimeEvent
        if (!data?.event) return

        const handler = eventHandlers[data.event]
        if (handler) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (handler as RealtimeHandler<any>)(data)
        }
      })

      subscription.subscribe()
      centrifuge.connect()
      initialized = true
    } catch (err) {
      console.error('[Centrifugo] Connection failed:', err)
    }
  }

  function disconnect() {
    if (subscription) {
      subscription.unsubscribe()
      subscription = null
    }
    if (centrifuge) {
      centrifuge.disconnect()
      centrifuge = null
    }
    initialized = false
    connected.value = false
  }

  return { connected, connect, disconnect }
}
