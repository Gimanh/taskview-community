<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('webhooks.payload') }}
      </h3>
    </template>
    <template #body>
      <pre class="p-3 bg-elevated rounded-lg text-xs whitespace-pre-wrap break-all">{{ formattedPayload }}</pre>
    </template>
    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          icon="i-lucide-copy"
          :label="t('webhooks.copy')"
          variant="ghost"
          :ui="{ leadingIcon: 'size-4!' }"
          @click="copy(formattedPayload)"
        />
        <UButton
          :label="t('common.close')"
          variant="ghost"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  payload: unknown
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { isMobile } = useTaskView()
const { copy } = useClipboard()

const formattedPayload = computed(() => JSON.stringify(props.payload, null, 2))
</script>
