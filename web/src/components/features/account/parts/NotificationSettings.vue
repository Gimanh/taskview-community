<template>
  <UPageCard class="w-full">
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold">{{ t('notifications.settings.title') }}</h2>
        <p class="text-sm text-dimmed mt-1">{{ t('notifications.settings.description') }}</p>
      </div>

      <div v-if="loading" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
      </div>

      <div v-else class="flex flex-col gap-0 divide-y divide-default">
        <div
          v-for="item in notificationTypes"
          :key="item.type"
          class="py-4 first:pt-0 last:pb-0"
        >
          <div class="flex flex-col gap-3">
            <div>
              <p class="text-sm font-medium">{{ item.label }}</p>
              <p class="text-xs text-dimmed">{{ item.description }}</p>
            </div>
            <div class="flex gap-4">
              <label
                v-for="channel in channels"
                :key="channel.key"
                class="flex items-center gap-2 cursor-pointer"
              >
                <UCheckbox
                  :model-value="isEnabled(item.type, channel.key)"
                  @update:model-value="toggle(item.type, channel.key, $event as boolean)"
                />
                <span class="text-sm">{{ channel.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NotificationType, NotificationChannel } from 'taskview-api'
import type { NotificationPreferencesSettings } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const settings = ref<NotificationPreferencesSettings>({})

const notificationTypes = computed(() => [
  {
    type: NotificationType.DEADLINE,
    label: t('notifications.settings.types.deadline'),
    description: t('notifications.settings.types.deadlineDescription'),
  },
  {
    type: NotificationType.ASSIGN,
    label: t('notifications.settings.types.assign'),
    description: t('notifications.settings.types.assignDescription'),
  },
])

const channels = computed(() => [
  { key: NotificationChannel.PUSH, label: t('notifications.settings.push') },
  { key: NotificationChannel.WEBSOCKET, label: t('notifications.settings.websocket') },
])

function isEnabled(type: NotificationType, channel: NotificationChannel): boolean {
  return settings.value.global?.[type]?.channels?.[channel] !== false
}

function toggle(type: NotificationType, channel: NotificationChannel, enabled: boolean) {
  if (!settings.value.global) settings.value.global = {}
  if (!settings.value.global[type]) settings.value.global[type] = {}
  if (!settings.value.global[type]!.channels) settings.value.global[type]!.channels = {}
  settings.value.global[type]!.channels![channel] = enabled
  save()
}

async function save() {
  try {
    const result = await $tvApi.notifications.savePreferences(settings.value)
    if (result) {
      toast.add({ title: t('notifications.settings.saved'), color: 'success' })
    }
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
}

onMounted(async () => {
  try {
    const result = await $tvApi.notifications.getPreferences()
    if (result) {
      settings.value = result.settings
    }
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
  loading.value = false
})
</script>
