<template>
  <div
    v-if="!isConnected || showReconnected"
    class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm text-white"
    :class="showReconnected ? 'bg-success' : 'bg-error'"
  >
    <UIcon
      :name="bannerIcon"
      class="size-4 shrink-0"
    />
    <span>{{ bannerMessage }}</span>
    <UButton
      v-if="showReconnected"
      :label="t('connection.reload')"
      size="xs"
      color="neutral"
      variant="outline"
      @click="reload"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStatus } from '@/composables/useConnectionStatus'

const { t } = useI18n()
const { isConnected, showReconnected, reload } = useConnectionStatus()

const bannerIcon = computed(() => {
  if (showReconnected.value) return 'i-lucide-wifi'
  return 'i-lucide-wifi-off'
})

const bannerMessage = computed(() => {
  if (showReconnected.value) return t('connection.restored')
  return t('connection.offline')
})
</script>
