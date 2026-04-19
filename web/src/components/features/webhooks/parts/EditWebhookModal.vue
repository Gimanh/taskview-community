<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('webhooks.edit') }}
      </h3>
    </template>
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField :label="t('webhooks.url')">
          <UInput
            v-model="url"
            :placeholder="t('webhooks.urlPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('webhooks.events')">
          <USelectMenu
            v-model="selectedEvents"
            :items="eventOptions"
            multiple
            value-key="value"
            :placeholder="t('webhooks.selectEvents')"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          variant="ghost"
          @click="isOpen = false"
        />
        <UButton
          :label="t('common.save')"
          color="primary"
          :disabled="!url || selectedEvents.length === 0"
          :loading="saving"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { WEBHOOK_EVENTS, type WebhookEvent } from 'taskview-api'
import type { WebhookItem } from 'taskview-api'
import { useWebhooksStore } from '@/stores/webhooks.store'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  webhook: WebhookItem | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const webhooksStore = useWebhooksStore()

const url = ref('')
const selectedEvents = ref<WebhookEvent[]>([])
const saving = ref(false)

const eventOptions = WEBHOOK_EVENTS.map((e) => ({
  label: e,
  value: e,
}))

watch(isOpen, (open) => {
  if (open && props.webhook) {
    url.value = props.webhook.url
    selectedEvents.value = [...props.webhook.events] as WebhookEvent[]
  }
})

async function handleSave() {
  if (!props.webhook) return
  saving.value = true
  try {
    await webhooksStore.updateWebhook({
      id: props.webhook.id,
      url: url.value,
      events: selectedEvents.value,
    })
    isOpen.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
