<template>
  <div class="flex items-center justify-between p-4 border border-default rounded-lg">
    <div class="flex items-center gap-3 min-w-0">
      <UIcon
        name="i-lucide-webhook"
        class="size-6 shrink-0"
        :class="webhook.isActive ? 'text-primary' : 'text-muted'"
      />
      <div class="min-w-0">
        <p class="font-medium truncate">
          {{ webhook.url }}
        </p>
        <div class="flex items-center gap-1 mt-1 flex-wrap">
          <UBadge
            v-for="event in webhook.events"
            :key="event"
            variant="subtle"
            size="xs"
          >
            {{ event }}
          </UBadge>
        </div>
      </div>
    </div>
    <div
      v-if="canManage"
      class="flex items-center gap-2 shrink-0 ml-2"
    >
      <UButton
        icon="i-lucide-pencil"
        variant="ghost"
        size="md"
        :title="t('webhooks.edit')"
        @click="emit('edit', webhook)"
      />
      <UButton
        icon="i-lucide-send"
        variant="ghost"
        size="md"
        :loading="testing"
        :title="t('webhooks.test')"
        @click="handleTest"
      />
      <UButton
        icon="i-lucide-history"
        variant="ghost"
        size="md"
        :title="t('webhooks.deliveries')"
        @click="emit('showDeliveries', webhook.id)"
      />
      <UButton
        icon="i-lucide-key-round"
        variant="ghost"
        size="md"
        :title="t('webhooks.rotateSecret')"
        @click="showRotateConfirm = true"
      />
      <USwitch
        :model-value="webhook.isActive"
        size="md"
        @update:model-value="handleToggle"
      />
      <UButton
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        size="md"
        @click="emit('delete', webhook.id)"
      />
    </div>
  </div>

  <UModal v-model:open="showRotateConfirm" :fullscreen="isMobile">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('webhooks.rotateSecret') }}
      </h3>
    </template>
    <template #body>
      <p class="text-sm">
        {{ t('webhooks.rotateConfirm') }}
      </p>
    </template>
    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          variant="ghost"
          @click="showRotateConfirm = false"
        />
        <UButton
          :label="t('webhooks.rotateSecret')"
          color="error"
          :loading="rotating"
          @click="handleRotateSecret"
        />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="showRotatedSecret" :fullscreen="isMobile">
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
        <span class="font-mono text-sm break-all">{{ rotatedSecret }}</span>
        <UButton
          icon="i-lucide-copy"
          variant="ghost"
          size="xs"
          class="shrink-0"
          @click="copy(rotatedSecret)"
        />
      </div>
    </template>
    <template #footer>
      <div class="w-full flex justify-end">
        <UButton
          :label="t('common.done')"
          color="primary"
          @click="showRotatedSecret = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import type { WebhookItem } from 'taskview-api'
import { useWebhooksStore } from '@/stores/webhooks.store'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  webhook: WebhookItem
  canManage: boolean
}>()

const emit = defineEmits<{
  toggle: [id: number, isActive: boolean]
  delete: [id: number]
  showDeliveries: [id: number]
  edit: [webhook: WebhookItem]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const { copy } = useClipboard()
const webhooksStore = useWebhooksStore()

const testing = ref(false)
const showRotateConfirm = ref(false)
const showRotatedSecret = ref(false)
const rotatedSecret = ref('')
const rotating = ref(false)

async function handleTest() {
  testing.value = true
  await webhooksStore.testDelivery(props.webhook.id)
  testing.value = false
}

function handleToggle(isActive: boolean) {
  emit('toggle', props.webhook.id, isActive)
}

async function handleRotateSecret() {
  rotating.value = true
  try {
    const secret = await webhooksStore.rotateSecret(props.webhook.id)
    if (secret) {
      showRotateConfirm.value = false
      rotatedSecret.value = secret
      showRotatedSecret.value = true
    }
  } finally {
    rotating.value = false
  }
}
</script>
