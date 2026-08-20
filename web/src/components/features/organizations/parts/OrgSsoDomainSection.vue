<template>
  <div class="flex flex-col gap-3 p-3 rounded-md border border-default">
    <div class="flex flex-col gap-2">
      <div>
        <p class="text-sm font-medium">
          {{ t('sso.domainVerification') }}
        </p>
        <p class="text-xs text-dimmed">
          {{ t('sso.domainVerificationDescription') }}
        </p>
      </div>
      <UBadge
        :color="verified ? 'success' : 'warning'"
        icon="mage:exclamation-triangle"
      >
        {{ verified ? t('sso.domainVerified') : t('sso.domainUnverified') }}
      </UBadge>
    </div>

    <p
      v-if="config.isDomainTrusted"
      class="text-xs text-dimmed"
    >
      {{ t('sso.domainTrustedHint') }}
    </p>

    <template v-else>
      <div class="flex flex-col gap-1">
        <p class="text-xs text-dimmed">
          {{ t('sso.domainVerifyDns') }}
        </p>
        <div class="flex items-center gap-2">
          <code class="text-xs flex-1 break-all">{{ dnsRecord }}</code>
          <UButton
            icon="i-lucide-copy"
            size="xs"
            variant="ghost"
            :disabled="!dnsRecord"
            @click="copyToClipboard(dnsRecord)"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <p class="text-xs text-dimmed">
          {{ t('sso.domainVerifyHttp') }}
        </p>
        <div class="flex items-center gap-2">
          <code class="text-xs flex-1 break-all">{{ httpUrl }}</code>
          <UButton
            icon="i-lucide-copy"
            size="xs"
            variant="ghost"
            :disabled="!httpUrl"
            @click="copyToClipboard(httpUrl)"
          />
        </div>
        <p class="text-xs text-dimmed">
          {{ t('sso.domainVerifyHttpBody', { token: config.domainVerifyToken || '' }) }}
        </p>
      </div>

      <UButton
        :label="t('sso.domainVerifyCheck')"
        icon="i-lucide-shield-check"
        variant="soft"
        size="lg"
        :loading="checking"
        @click="check"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { $tvApi } from '@/plugins/axios'
import type { SsoConfig } from 'taskview-api'

const props = defineProps<{
  config: SsoConfig
}>()

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()
const toast = useToast()
const checking = ref(false)

const verified = computed(() => props.config.isDomainVerified)
const dnsRecord = computed(() => props.config.domainVerifyDnsRecord || '')
const httpUrl = computed(() => props.config.domainVerifyHttpUrl || '')

onMounted(async () => {
  if (props.config.domainVerifyToken || props.config.isDomainTrusted) return
  try {
    await $tvApi.sso.startDomainVerification(props.config.id)
    emit('updated')
  } catch {
    /* token will appear after the next fetch */
  }
})

async function copyToClipboard(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: t('sso.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.copyFailed'), color: 'error' })
  }
}

async function check() {
  checking.value = true
  try {
    const result = await $tvApi.sso.checkDomainVerification(props.config.id)
    if (result.verified) {
      toast.add({ title: t('sso.domainVerifySuccess'), color: 'success' })
      emit('updated')
    } else {
      toast.add({ title: t('sso.domainVerifyFailed'), color: 'error' })
    }
  } catch {
    toast.add({ title: t('sso.domainVerifyFailed'), color: 'error' })
  } finally {
    checking.value = false
  }
}
</script>
