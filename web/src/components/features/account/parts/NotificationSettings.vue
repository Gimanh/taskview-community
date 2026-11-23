<template>
  <UPageCard
    variant="soft"
    class="w-full rounded-3xl"
  >
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold">
          {{ t('notifications.settings.title') }}
        </h2>
        <p class="text-sm text-dimmed mt-1">
          {{ t('notifications.settings.description') }}
        </p>
      </div>

      <div
        v-if="loading"
        class="flex justify-center py-4"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-5 animate-spin"
        />
      </div>

      <div
        v-else
        class="flex flex-col gap-0 divide-y divide-default"
      >
        <div
          v-for="item in notificationTypes"
          :key="item.type"
          class="py-4 first:pt-0 last:pb-0"
        >
          <div class="flex flex-col gap-3">
            <div>
              <p class="text-sm font-medium">
                {{ item.label }}
              </p>
              <p class="text-xs text-dimmed">
                {{ item.description }}
              </p>
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
import { getNotificationSettingTypeProviders } from '@/extensions/registry'
import type { NotificationSettingType } from '@/extensions/types'

type ChannelSettings = { channels?: Partial<Record<NotificationChannel, boolean>> }

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const settings = ref<NotificationPreferencesSettings>({})
const emailAvailable = ref(false)

const extensionTypes = getNotificationSettingTypeProviders().map((provide) => provide())

const notificationTypes = computed<NotificationSettingType[]>(() => [
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
  ...extensionTypes.flatMap((provided) => provided.value),
])

const channels = computed(() => [
  { key: NotificationChannel.PUSH, label: t('notifications.settings.push') },
  { key: NotificationChannel.WEBSOCKET, label: t('notifications.settings.websocket') },
  ...(emailAvailable.value ? [{ key: NotificationChannel.EMAIL, label: t('notifications.settings.email') }] : []),
])

function globalSettings(): Record<string, ChannelSettings | undefined> {
  if (!settings.value.global) settings.value.global = {}
  return settings.value.global
}

function isEnabled(type: string, channel: NotificationChannel): boolean {
  const choice = globalSettings()[type]?.channels?.[channel]
  return channel === NotificationChannel.EMAIL ? choice === true : choice !== false
}

function toggle(type: string, channel: NotificationChannel, enabled: boolean) {
  const scope = globalSettings()
  const typeSettings = scope[type] ?? (scope[type] = {})
  typeSettings.channels = { ...typeSettings.channels, [channel]: enabled }
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
      emailAvailable.value = result.emailAvailable === true
    }
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
  loading.value = false
})
</script>
