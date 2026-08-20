<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between p-3 rounded-md bg-elevated">
      <div>
        <p class="text-sm font-medium">
          {{ config.displayName }}
        </p>
        <p class="text-xs text-dimmed">
          ID {{ config.id }} &middot; {{ config.protocol.toUpperCase() }} &middot; {{ config.emailDomainRestriction }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="text-xs"
          :class="config.enabled ? 'text-success' : 'text-dimmed'"
        >
          {{ config.enabled ? t('sso.enabled') : t('sso.disabled') }}
        </span>
        <USwitch
          :model-value="!!config.enabled"
          :loading="toggling"
          @update:model-value="toggleEnabled"
        />
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          variant="soft"
          @click="$emit('edit')"
        />
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          variant="soft"
          color="error"
          @click="$emit('delete')"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1 p-3 rounded-md bg-elevated">
      <p class="text-xs text-dimmed">
        {{ t('sso.callbackUrlLabel') }}
      </p>
      <div class="flex items-center gap-2">
        <code class="text-xs flex-1 break-all">{{ callbackUrl }}</code>
        <UButton
          icon="i-lucide-copy"
          size="xs"
          variant="soft"
          @click="copyToClipboard(callbackUrl)"
        />
      </div>
    </div>

    <OrgSsoDomainSection
      :config="config"
      @updated="$emit('updated')"
    />

    <OrgSsoScimSection
      :config="config"
      :endpoint-url="scimEndpointUrl"
      @updated="$emit('updated')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { $tvApi } from '@/plugins/axios'
import type { SsoConfig } from 'taskview-api'
import OrgSsoScimSection from './OrgSsoScimSection.vue'
import OrgSsoDomainSection from './OrgSsoDomainSection.vue'

const props = defineProps<{
  config: SsoConfig
  callbackUrl: string
  scimEndpointUrl: string
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  updated: []
}>()

const { t } = useI18n()
const toast = useToast()

const toggling = ref(false)

async function toggleEnabled(enabled: boolean) {
  toggling.value = true
  try {
    await $tvApi.sso.updateConfig(props.config.id, { enabled: enabled ? 1 : 0 })
    emit('updated')
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    toast.add({
      title: status === 403 ? t('sso.enableRequiresVerifiedDomain') : t('sso.toggleFailed'),
      color: 'error',
    })
  } finally {
    toggling.value = false
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: t('sso.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.copyFailed'), color: 'error' })
  }
}
</script>
