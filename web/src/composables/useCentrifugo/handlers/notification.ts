import { useNotificationsStore } from '@/stores/notifications.store'
import type { RealtimeEventMap } from '../types'

export function handleNotification(data: RealtimeEventMap['notification']) {
  const notificationsStore = useNotificationsStore()
  notificationsStore.addRealtimeNotification({
    ...data.notification,
    goalId: data.goalId ?? null,
    goalListId: data.goalListId ?? null,
  })
}
