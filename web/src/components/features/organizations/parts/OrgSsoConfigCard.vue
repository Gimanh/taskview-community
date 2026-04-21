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
        <UBadge :color="config.enabled ? 'success' : 'neutral'">
          {{ config.enabled ? t('sso.enabled') : t('sso.disabled') }}
        </UBadge>
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          variant="ghost"
          @click="$emit('edit')"
        />
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          variant="ghost"
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
          variant="ghost"
          @click="copyToClipboard(callbackUrl)"
        />
      </div>
    </div>

    <OrgSsoScimSection
      :config="config"
      :endpoint-url="scimEndpointUrl"
      @updated="$emit('updated')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SsoConfig } from 'taskview-api'
import OrgSsoScimSection from './OrgSsoScimSection.vue'

defineProps<{
  config: SsoConfig
  callbackUrl: string
  scimEndpointUrl: string
}>()

defineEmits<{
  edit: []
  delete: []
  updated: []
}>()

const { t } = useI18n()
const toast = useToast()

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: t('sso.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.copyFailed'), color: 'error' })
  }
}
</script>
