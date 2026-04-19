<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('webhooks.add') }}
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
          :label="t('common.add')"
          color="primary"
          :disabled="!url || selectedEvents.length === 0"
          :loading="saving"
          @click="handleCreate"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="showSecret"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('webhooks.secretTitle') }}
      </h3>
    </template>
    <template #body>
      <p class="text-sm text-muted mb-3">
        {{ t('webhooks.secretDescription') }}
      </p>
      <div class="flex items-center justify-between gap-2 p-3 bg-elevated rounded-lg">
        <span class="font-mono text-sm break-all">{{ createdSecret }}</span>
        <UButton
          icon="i-lucide-copy"
          variant="ghost"
          size="xs"
          class="shrink-0"
          @click="copySecret(createdSecret)"
        />
      </div>
    </template>
    <template #footer>
      <div class="w-full flex justify-end">
        <UButton
          :label="t('common.done')"
          color="primary"
          @click="showSecret = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import { WEBHOOK_EVENTS, type WebhookEvent } from 'taskview-api'
import { useWebhooksStore } from '@/stores/webhooks.store'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  goalId: number
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const webhooksStore = useWebhooksStore()
const { copy } = useClipboard()

const url = ref('')
const selectedEvents = ref<WebhookEvent[]>([])
const saving = ref(false)
const showSecret = ref(false)
const createdSecret = ref('')

const eventOptions = WEBHOOK_EVENTS.map((e) => ({
  label: e,
  value: e,
}))

function copySecret(secret: string) {
  copy(secret)
}

async function handleCreate() {
  saving.value = true
  try {
    const result = await webhooksStore.createWebhook({
      goalId: props.goalId,
      url: url.value,
      events: selectedEvents.value,
    })

    if (result) {
      isOpen.value = false
      createdSecret.value = result.secret
      showSecret.value = true
      url.value = ''
      selectedEvents.value = []
      emit('created')
    }
  } finally {
    saving.value = false
  }
}
</script>
