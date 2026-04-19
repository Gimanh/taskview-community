<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('sso.metadataUrl')">
      <div class="flex gap-2">
        <UInput
          v-model="metadataUrl"
          placeholder="https://idp.example.com/saml/metadata"
          class="flex-1"
        />
        <UButton
          :label="t('sso.sync')"
          :loading="syncing"
          icon="i-lucide-refresh-cw"
          variant="outline"
          :ui="{ leadingIcon: 'size-4.5' }"
          @click="syncMetadata"
        />
      </div>
    </UFormField>

    <UFormField :label="t('sso.samlEntryPoint')">
      <UInput
        v-model="form.samlEntryPoint"
        placeholder="https://idp.example.com/saml/sso"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('sso.samlIssuer')">
      <UInput
        v-model="form.samlIssuer"
        placeholder="taskview"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('sso.samlCert')">
      <UTextarea
        v-model="form.samlCert"
        :placeholder="hasSecrets?.hasSamlCert ? t('sso.secretConfigured') : t('sso.samlCertPlaceholder')"
        :rows="4"
        class="w-full"
      />
      <template
        v-if="hasSecrets?.hasSamlCert && !form.samlCert"
        #hint
      >
        <span class="text-success">{{ t('sso.secretAlreadySet') }}</span>
      </template>
    </UFormField>

    <UFormField :label="t('sso.samlCallbackUrl')">
      <UInput
        v-model="form.samlCallbackUrl"
        :placeholder="callbackUrlPlaceholder"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('sso.samlLogoutUrl')">
      <UInput
        v-model="form.samlLogoutUrl"
        placeholder="https://idp.example.com/saml/logout"
        class="w-full"
      />
    </UFormField>

    <UCollapsible>
      <UButton
        class="group"
        :label="t('sso.requestSigning')"
        color="neutral"
        variant="ghost"
        trailing-icon="i-lucide-chevron-down"
        :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
        size="sm"
      />
      <template #content>
        <div class="flex flex-col gap-4 pt-2">
          <UAlert
            color="info"
            icon="i-lucide-shield"
            :title="t('sso.requestSigningDescription')"
          />
          <UAlert
            color="neutral"
            icon="i-lucide-terminal"
            :title="t('sso.generateKeysTitle')"
            :description="t('sso.generateKeysHint')"
          >
            <template #actions>
              <UButton
                icon="i-lucide-copy"
                size="xs"
                variant="ghost"
                @click="copyOpenSslCommand"
              />
            </template>
          </UAlert>
          <UFormField :label="t('sso.samlSigningKey')">
            <UTextarea
              v-model="form.samlSigningKey"
              :placeholder="hasSecrets?.hasSamlSigningKey ? t('sso.secretConfigured') : t('sso.samlSigningKeyPlaceholder')"
              :rows="4"
              class="w-full"
            />
            <template
              v-if="hasSecrets?.hasSamlSigningKey && !form.samlSigningKey"
              #hint
            >
              <span class="text-success">{{ t('sso.secretAlreadySet') }}</span>
            </template>
          </UFormField>
          <UFormField :label="t('sso.samlSigningCert')">
            <UTextarea
              v-model="form.samlSigningCert"
              :placeholder="hasSecrets?.hasSamlSigningCert ? t('sso.secretConfigured') : t('sso.samlSigningCertPlaceholder')"
              :rows="4"
              class="w-full"
            />
            <template
              v-if="hasSecrets?.hasSamlSigningCert && !form.samlSigningCert"
              #hint
            >
              <span class="text-success">{{ t('sso.secretAlreadySet') }}</span>
            </template>
          </UFormField>
        </div>
      </template>
    </UCollapsible>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { $tvApi } from '@/plugins/axios'

type SamlFormData = {
  samlEntryPoint: string
  samlIssuer: string
  samlCert: string
  samlCallbackUrl: string
  samlSigningKey: string
  samlSigningCert: string
  samlLogoutUrl: string
}

const form = defineModel<SamlFormData>('form', { required: true })

import type { SsoConfig } from 'taskview-api'

defineProps<{
  callbackUrlPlaceholder: string
  hasSecrets?: SsoConfig
}>()

const { t } = useI18n()
const toast = useToast()

const metadataUrl = ref('')
const syncing = ref(false)

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: t('sso.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.copyFailed'), color: 'error' })
  }
}

function copyOpenSslCommand() {
  copyToClipboard('openssl req -x509 -newkey rsa:2048 -keyout sp-key.pem -out sp-cert.pem -days 3650 -nodes -subj "/CN=taskview"')
}

async function syncMetadata() {
  if (!metadataUrl.value.trim()) {
    toast.add({ title: t('sso.metadataUrlRequired'), color: 'warning' })
    return
  }

  syncing.value = true
  try {
    const result = await $tvApi.sso.parseMetadata(metadataUrl.value.trim())
    if (result.samlEntryPoint) form.value.samlEntryPoint = result.samlEntryPoint
    if (result.samlCert) form.value.samlCert = result.samlCert
    if (result.samlLogoutUrl) form.value.samlLogoutUrl = result.samlLogoutUrl
    toast.add({ title: t('sso.metadataSynced'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.metadataSyncFailed'), color: 'error' })
  } finally {
    syncing.value = false
  }
}
</script>
