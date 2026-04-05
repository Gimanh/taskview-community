<template>
  <UButton
    icon="i-lucide-bell"
    color="neutral"
    variant="ghost"
    size="xl"
    class="relative"
    :aria-label="t('notifications.title')"
    @click="isOpen = true"
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

  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
    :ui="{
      overlay: 'sm:items-center sm:justify-center',
      content: 'sm:max-w-lg sm:max-h-[80vh] sm:rounded-lg sm:m-auto w-full',
      body: 'p-0!',
      footer: 'p-4!',
    }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="font-semibold">{{ t('notifications.title') }}</h3>
        <UButton
          v-if="notificationsStore.unreadCount > 0"
          :label="t('notifications.markAllRead')"
          variant="link"
          size="xs"
          @click="handleMarkAllRead"
        />
      </div>
    </template>

    <template #body>
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
            <UIcon
              :name="notificationIcon(notification.type)"
              class="mt-0.5 size-4 shrink-0"
              :class="notification.read ? 'text-dimmed' : 'text-primary'"
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

        <div
          v-if="notificationsStore.hasMore && notificationsStore.notifications.length > 0"
          class="p-2"
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

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          :label="t('common.close')"
          color="neutral"
          variant="outline"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Notification } from 'taskview-api'
import { NotificationType } from 'taskview-api'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useUserStore } from '@/stores/user.store'
import { useTaskView } from '@/composables/useTaskView'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { formatDistanceToNow } from 'date-fns'
import { useOrganizationStore } from '@/stores/organization.store'

const { t } = useI18n()
const router = useRouter()
const notificationsStore = useNotificationsStore()
const userStore = useUserStore()
const orgStore = useOrganizationStore()
const { isMobile } = useTaskView()
const isOpen = ref(false)

const notificationIconMap: Partial<Record<NotificationType, string>> = {
  [NotificationType.DEADLINE]: 'i-lucide-clock',
  [NotificationType.ASSIGN]: 'i-lucide-user-plus',
  [NotificationType.MENTION]: 'i-lucide-at-sign',
  [NotificationType.COMMENT]: 'i-lucide-message-circle',
  [NotificationType.STATUS_CHANGE]: 'i-lucide-arrow-right-left',
}

function notificationIcon(type: NotificationType) {
  return notificationIconMap[type] || 'i-lucide-bell'
}

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

watch(() => orgStore.currentOrg, () => {
  notificationsStore.fetchNotifications(true)
})
</script>
