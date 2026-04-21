<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('sso.oidcIssuer')">
      <UInput
        v-model="form.oidcIssuer"
        placeholder="https://accounts.google.com"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('sso.oidcClientId')">
      <UInput
        v-model="form.oidcClientId"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('sso.oidcClientSecret')">
      <UInput
        v-model="form.oidcClientSecret"
        type="password"
        :placeholder="hasSecrets?.hasOidcClientSecret ? t('sso.secretConfigured') : ''"
        class="w-full"
      />
      <template
        v-if="hasSecrets?.hasOidcClientSecret && !form.oidcClientSecret"
        #hint
      >
        <span class="text-success">{{ t('sso.secretAlreadySet') }}</span>
      </template>
    </UFormField>

    <UFormField :label="t('sso.oidcCallbackUrl')">
      <UInput
        v-model="form.oidcCallbackUrl"
        :placeholder="callbackUrlPlaceholder"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

type OidcFormData = {
  oidcIssuer: string
  oidcClientId: string
  oidcClientSecret: string
  oidcCallbackUrl: string
}

const form = defineModel<OidcFormData>('form', { required: true })

import type { SsoConfig } from 'taskview-api'

defineProps<{
  callbackUrlPlaceholder: string
  hasSecrets?: SsoConfig
}>()

const { t } = useI18n()
</script>
