<template>
  <div class="flex flex-col gap-3 p-3 rounded-md border border-default">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium">
          SCIM Provisioning
        </p>
        <p class="text-xs text-dimmed">
          {{ t('scim.description') }}
        </p>
      </div>
      <USwitch
        :model-value="!!config.scimEnabled"
        @update:model-value="toggle"
      />
    </div>

    <template v-if="config.scimEnabled">
      <div class="flex flex-col gap-1">
        <p class="text-xs text-dimmed">
          {{ t('scim.endpointUrl') }}
        </p>
        <div class="flex items-center gap-2">
          <code class="text-xs flex-1 break-all">{{ endpointUrl }}</code>
          <UButton
            icon="i-lucide-copy"
            size="xs"
            variant="ghost"
            @click="copyToClipboard(endpointUrl)"
          />
        </div>
      </div>

      <div
        v-if="token"
        class="flex flex-col gap-1"
      >
        <UAlert
          color="warning"
          icon="i-lucide-alert-triangle"
          :title="t('scim.tokenWarning')"
        />
        <div class="flex items-center gap-2">
          <code class="text-xs flex-1 break-all">{{ token }}</code>
          <UButton
            icon="i-lucide-copy"
            size="xs"
            variant="ghost"
            @click="copyToClipboard(token)"
          />
        </div>
      </div>

      <UButton
        :label="config.hasScimToken ? t('scim.regenerateToken') : t('scim.generateToken')"
        icon="i-lucide-key-round"
        variant="outline"
        size="sm"
        :loading="generating"
        @click="generate"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { $tvApi } from '@/plugins/axios'
import type { SsoConfig } from 'taskview-api'

const props = defineProps<{
  config: SsoConfig
  endpointUrl: string
}>()

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()
const toast = useToast()

const token = ref('')
const generating = ref(false)

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: t('sso.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.copyFailed'), color: 'error' })
  }
}

async function toggle(enabled: boolean) {
  try {
    await $tvApi.sso.toggleScim(props.config.id, enabled)
    if (!enabled) token.value = ''
    emit('updated')
  } catch {
    toast.add({ title: t('scim.toggleFailed'), color: 'error' })
  }
}

async function generate() {
  generating.value = true
  try {
    const result = await $tvApi.sso.generateScimToken(props.config.id)
    token.value = result.token
    emit('updated')
    toast.add({ title: t('scim.tokenGenerated'), color: 'success' })
  } catch {
    toast.add({ title: t('scim.tokenFailed'), color: 'error' })
  } finally {
    generating.value = false
  }
}
</script>
