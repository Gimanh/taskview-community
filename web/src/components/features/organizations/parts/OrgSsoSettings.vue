<template>
  <div class="flex flex-col gap-4 pt-4">
    <template v-if="!ssoConfig && !showForm">
      <div class="text-center py-6 text-muted">
        <p>{{ t('sso.noConfig') }}</p>
        <UButton
          :label="t('sso.configure')"
          class="mt-3"
          @click="showForm = true"
        />
      </div>
    </template>

    <template v-else-if="ssoConfig && !showForm">
      <OrgSsoConfigCard
        :config="ssoConfig"
        :callback-url="activeCallbackUrl"
        :scim-endpoint-url="scimEndpointUrl"
        @edit="editConfig"
        @delete="deleteConfig"
        @updated="fetchConfig"
      />
    </template>

    <template v-if="showForm">
      <OrgSsoConfigForm
        v-model:form="form"
        :is-editing="isEditing"
        :saving="saving"
        :callback-url-placeholder="callbackUrlPlaceholder"
        :has-secrets="isEditing && ssoConfig ? ssoConfig : undefined"
        @save="saveConfig"
        @cancel="cancelForm"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { $tvApi } from '@/plugins/axios'
import { additionalUrlStore } from '@/stores/additional-url.store'
import { useAdditionalServer } from '@/composables/useAdditionalServer'
import type { SsoConfig } from 'taskview-api'
import OrgSsoConfigCard from './OrgSsoConfigCard.vue'
import OrgSsoConfigForm from './OrgSsoConfigForm.vue'

const props = defineProps<{
  organizationId: number
}>()

const { t } = useI18n()
const toast = useToast()
const { mainServer } = storeToRefs(additionalUrlStore())

const ssoConfig = ref<SsoConfig | null>(null)
const showForm = ref(false)
const saving = ref(false)
const isEditing = ref(false)

const form = reactive({
  protocol: 'saml' as 'saml' | 'oidc',
  displayName: '',
  emailDomainRestriction: '',
  samlEntryPoint: '',
  samlIssuer: '',
  samlCert: '',
  samlCallbackUrl: '',
  samlSigningKey: '',
  samlSigningCert: '',
  samlLogoutUrl: '',
  oidcIssuer: '',
  oidcClientId: '',
  oidcClientSecret: '',
  oidcCallbackUrl: '',
})

const apiBaseUrl = computed(() => mainServer.value || window.location.origin)
const callbackUrlPlaceholder = computed(() => `${apiBaseUrl.value}/module/sso/callback/${ssoConfig.value?.id ?? '{id}'}`)
const activeCallbackUrl = computed(() => ssoConfig.value ? `${apiBaseUrl.value}/module/sso/callback/${ssoConfig.value.id}` : '')
const scimEndpointUrl = computed(() => `${apiBaseUrl.value}/scim/v2`)

onMounted(async () => {
  await useAdditionalServer()
})

watch(() => props.organizationId, () => fetchConfig(), { immediate: true })

async function fetchConfig() {
  try {
    const configs = await $tvApi.sso.listConfigs(props.organizationId)
    ssoConfig.value = configs.length > 0 ? configs[0] : null
  } catch {
    ssoConfig.value = null
  }
}

function editConfig() {
  if (!ssoConfig.value) return
  isEditing.value = true
  showForm.value = true

  form.protocol = ssoConfig.value.protocol
  form.displayName = ssoConfig.value.displayName
  form.emailDomainRestriction = ssoConfig.value.emailDomainRestriction
  form.samlEntryPoint = ssoConfig.value.samlEntryPoint ?? ''
  form.samlIssuer = ssoConfig.value.samlIssuer ?? ''
  form.samlCert = ''
  form.samlCallbackUrl = ssoConfig.value.samlCallbackUrl ?? ''
  form.samlSigningKey = ''
  form.samlSigningCert = ''
  form.samlLogoutUrl = ssoConfig.value.samlLogoutUrl ?? ''
  form.oidcIssuer = ssoConfig.value.oidcIssuer ?? ''
  form.oidcClientId = ssoConfig.value.oidcClientId ?? ''
  form.oidcClientSecret = ''
  form.oidcCallbackUrl = ssoConfig.value.oidcCallbackUrl ?? ''
}

function cancelForm() {
  showForm.value = false
  isEditing.value = false
  resetForm()
}

function resetForm() {
  form.protocol = 'saml'
  form.displayName = ''
  form.emailDomainRestriction = ''
  form.samlEntryPoint = ''
  form.samlIssuer = ''
  form.samlCert = ''
  form.samlCallbackUrl = ''
  form.samlSigningKey = ''
  form.samlSigningCert = ''
  form.samlLogoutUrl = ''
  form.oidcIssuer = ''
  form.oidcClientId = ''
  form.oidcClientSecret = ''
  form.oidcCallbackUrl = ''
}

async function saveConfig() {
  if (!form.displayName || !form.emailDomainRestriction) {
    toast.add({ title: t('sso.fillRequired'), color: 'warning' })
    return
  }

  saving.value = true

  try {
    if (isEditing.value && ssoConfig.value) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { protocol: _protocol, ...updatePayload } = form
      await $tvApi.sso.updateConfig(ssoConfig.value.id, updatePayload)
      toast.add({ title: t('sso.updated'), color: 'success' })
    } else {
      await $tvApi.sso.createConfig({
        organizationId: props.organizationId,
        ...form,
      })
      toast.add({ title: t('sso.created'), color: 'success' })
    }

    showForm.value = false
    isEditing.value = false
    resetForm()
    await fetchConfig()
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } }
    if (axiosError.response?.status === 409) {
      toast.add({ title: t('sso.domainAlreadyExists'), color: 'error' })
    } else {
      toast.add({ title: t('sso.saveFailed'), color: 'error' })
    }
  } finally {
    saving.value = false
  }
}

async function deleteConfig() {
  if (!ssoConfig.value) return
  try {
    await $tvApi.sso.deleteConfig(ssoConfig.value.id)
    ssoConfig.value = null
    toast.add({ title: t('sso.deleted'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.deleteFailed'), color: 'error' })
  }
}
</script>
