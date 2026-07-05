<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('messaging.connectTitle') }}
      </h3>
    </template>

    <template #body>
      <div
        v-if="step === 'select'"
        class="flex flex-col gap-3"
      >
        <p class="text-sm text-muted">
          {{ t('messaging.connectDescription') }}
        </p>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors"
            :class="provider === 'telegram' ? 'border-primary bg-primary/5' : 'border-default hover:border-primary'"
            @click="provider = 'telegram'"
          >
            <UIcon
              name="i-lucide-send"
              class="size-8 text-primary"
            />
            <span class="font-medium">{{ t('messaging.telegram') }}</span>
          </button>
          <button
            type="button"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors"
            :class="provider === 'slack' ? 'border-primary bg-primary/5' : 'border-default hover:border-primary'"
            @click="provider = 'slack'"
          >
            <UIcon
              name="i-lucide-slack"
              class="size-8 text-primary"
            />
            <span class="font-medium">{{ t('messaging.slack') }}</span>
          </button>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <p class="text-sm">
          {{ scope === 'project' ? t('messaging.projectInstructions') : t('messaging.personalInstructions') }}
        </p>

        <div
          v-if="scope === 'project'"
          class="flex flex-col gap-1"
        >
          <span class="text-xs text-muted">{{ t('messaging.command') }}</span>
          <div class="flex items-center justify-between gap-2 p-3 bg-elevated rounded-lg">
            <span class="font-mono text-sm break-all">/connect {{ link?.token }}</span>
            <UButton
              icon="i-lucide-copy"
              variant="ghost"
              size="xs"
              class="shrink-0"
              @click="copy(`/connect ${link?.token}`)"
            />
          </div>
        </div>

        <UButton
          :label="scope === 'project' ? t('messaging.addBotToGroup') : t('messaging.openInTelegram')"
          icon="i-lucide-external-link"
          color="primary"
          block
          @click="openLink"
        />
      </div>
    </template>

    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          v-if="step === 'select'"
          :label="t('common.cancel')"
          variant="ghost"
          color="neutral"
          @click="open = false"
        />
        <UButton
          v-if="step === 'select'"
          :label="provider === 'slack' ? t('messaging.continueWithSlack') : t('messaging.getLink')"
          color="primary"
          variant="soft"
          :loading="loading"
          @click="proceed"
        />
        <UButton
          v-else
          :label="t('common.done')"
          color="primary"
          variant="outline"
          @click="finish"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import type { MessagingConnectLinkResult, MessagingProviderId } from 'taskview-api'
import { useMessagingStore } from '@/stores/messaging.store'
import { useTaskView } from '@/composables/useTaskView'
import { useTaskViewMainUrl } from '@/composables/useTaskViewMainUrl'
import $api from '@/helpers/axios'

const props = defineProps<{
  scope: 'user' | 'project'
  goalId: number
}>()

const emit = defineEmits<{ connected: [] }>()

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { isMobile } = useTaskView()
const { copy } = useClipboard()
const store = useMessagingStore()
const toast = useToast()

const step = ref<'select' | 'link'>('select')
const provider = ref<MessagingProviderId>('telegram')
const link = ref<MessagingConnectLinkResult | null>(null)
const loading = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    step.value = 'select'
    provider.value = 'telegram'
    link.value = null
  }
})

function proceed() {
  if (provider.value === 'slack') {
    startSlackOAuth()
    return
  }
  requestLink()
}

function startSlackOAuth() {
  const baseUrl = useTaskViewMainUrl()
  const token = $api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '') || ''
  // returnPath brings the user back to this in-app page after the OAuth callback,
  // instead of dumping them on the app root (which shows the login screen).
  const params = new URLSearchParams({ scope: props.scope, token, returnPath: window.location.pathname })
  if (props.scope === 'project') params.set('goalId', String(props.goalId))
  window.location.href = `${baseUrl}/module/messaging/slack/oauth/start?${params.toString()}`
}

async function requestLink() {
  loading.value = true
  try {
    const result =
      props.scope === 'project'
        ? await store.connectProject(provider.value, props.goalId)
        : await store.connectPersonal(provider.value)
    if (!result) {
      toast.add({ title: t('messaging.notConfigured'), color: 'error' })
      return
    }
    link.value = result
    step.value = 'link'
  } catch {
    toast.add({ title: t('messaging.connectFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

function openLink() {
  if (link.value?.url) window.open(link.value.url, '_blank')
}

function finish() {
  open.value = false
  emit('connected')
}
</script>
