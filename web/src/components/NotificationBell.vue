<template>
  <UPopover
    v-model:open="isOpen"
    :content="{ align: 'end', side: 'right', sideOffset: 8 }"
  >
    <UButton
      icon="i-lucide-bell"
      color="neutral"
      variant="ghost"
      size="xl"
      class="relative"
      :aria-label="t('notifications.title')"
    >
      <template v-if="notificationsStore.unreadCount > 0" #trailing>
        <UBadge
          :label="notificationsStore.unreadCount > 99 ? '99+' : String(notificationsStore.unreadCount)"
          color="error"
          size="xs"
          class="absolute -top-1 -right-1 min-w-5 justify-center"
        />
      </template>
    </UButton>

    <template #content>
      <div class="w-80 max-h-96 flex flex-col">
        <div class="flex items-center justify-between p-3 border-b border-default">
          <span class="text-sm font-medium">{{ t('notifications.title') }}</span>
          <UButton
            v-if="notificationsStore.unreadCount > 0"
            :label="t('notifications.markAllRead')"
            variant="link"
            size="xs"
            @click="handleMarkAllRead"
          />
        </div>

        <div class="overflow-y-auto flex-1">
          <div
            v-if="notificationsStore.notifications.length === 0"
            class="p-6 text-center text-sm text-dimmed"
          >
            {{ t('notifications.empty') }}
          </div>

          <div
            v-for="notification in notificationsStore.notifications"
            :key="notification.id"
            class="p-3 border-b border-default last:border-b-0 cursor-pointer hover:bg-elevated/50 transition-colors"
            :class="{ 'bg-elevated/25': !notification.read }"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex items-start gap-2">
              <span
                v-if="!notification.read"
                class="mt-1.5 size-2 rounded-full bg-primary shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ notification.title }}</p>
                <p
                  v-if="notification.body"
                  class="text-xs text-dimmed mt-0.5 line-clamp-2"
                >
                  {{ notification.body }}
                </p>
                <p class="text-xs text-dimmed mt-1">
                  {{ formatDate(notification.createdAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="notificationsStore.hasMore && notificationsStore.notifications.length > 0"
          class="p-2 border-t border-default"
        >
          <UButton
            :label="t('notifications.loadMore')"
            variant="ghost"
            color="neutral"
            size="xs"
            block
            :loading="notificationsStore.loading"
            @click="notificationsStore.fetchNotifications()"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Notification } from 'taskview-api'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useUserStore } from '@/stores/user.store'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { formatDistanceToNow } from 'date-fns'

const { t } = useI18n()
const router = useRouter()
const notificationsStore = useNotificationsStore()
const userStore = useUserStore()
const isOpen = ref(false)

function formatDate(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

async function handleNotificationClick(notification: Notification) {
  if (!notification.read) {
    await notificationsStore.markRead(notification.id)
  }
  if (notification.taskId && notification.goalId) {
    isOpen.value = false
    router.push({
      name: 'user',
      params: {
        projectId: notification.goalId,
        listId: notification.goalListId ?? ALL_TASKS_LIST_ID,
        taskId: notification.taskId,
      },
    })
  }
}

async function handleMarkAllRead() {
  await notificationsStore.markAllRead()
}

watch(isOpen, (open) => {
  if (open && notificationsStore.notifications.length === 0) {
    notificationsStore.fetchNotifications(true)
  }
})

onMounted(() => {
  if (userStore.isLoggedIn) {
    notificationsStore.fetchNotifications(true)
  }
})
</script>
