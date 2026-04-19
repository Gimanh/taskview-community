<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('sso.protocol')">
      <USelect
        v-model="form.protocol"
        :items="protocolOptions"
        class="w-full"
        size="xl"
      />
    </UFormField>

    <UFormField :label="t('sso.displayName')">
      <UInput
        v-model="form.displayName"
        :placeholder="t('sso.displayNamePlaceholder')"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('sso.emailDomain')">
      <UInput
        v-model="form.emailDomainRestriction"
        placeholder="company.com"
        class="w-full"
      />
    </UFormField>

    <SsoSamlForm
      v-if="form.protocol === 'saml'"
      v-model:form="form"
      :callback-url-placeholder="callbackUrlPlaceholder"
      :has-secrets="hasSecrets"
    />

    <SsoOidcForm
      v-if="form.protocol === 'oidc'"
      v-model:form="form"
      :callback-url-placeholder="callbackUrlPlaceholder"
      :has-secrets="hasSecrets"
    />

    <div class="flex gap-2">
      <UButton
        :label="isEditing ? t('sso.save') : t('sso.create')"
        :loading="saving"
        @click="$emit('save')"
      />
      <UButton
        :label="t('sso.cancel')"
        variant="ghost"
        color="neutral"
        @click="$emit('cancel')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SsoSamlForm from './SsoSamlForm.vue'
import SsoOidcForm from './SsoOidcForm.vue'

type SsoFormData = {
  protocol: 'saml' | 'oidc'
  displayName: string
  emailDomainRestriction: string
  samlEntryPoint: string
  samlIssuer: string
  samlCert: string
  samlCallbackUrl: string
  samlSigningKey: string
  samlSigningCert: string
  samlLogoutUrl: string
  oidcIssuer: string
  oidcClientId: string
  oidcClientSecret: string
  oidcCallbackUrl: string
}

const form = defineModel<SsoFormData>('form', { required: true })

import type { SsoConfig } from 'taskview-api'

defineProps<{
  isEditing: boolean
  saving: boolean
  callbackUrlPlaceholder: string
  hasSecrets?: SsoConfig
}>()

defineEmits<{
  save: []
  cancel: []
}>()

const { t } = useI18n()

const protocolOptions = [
  { label: 'SAML 2.0', value: 'saml' },
  { label: 'OpenID Connect', value: 'oidc' },
]
</script>
