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
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between p-3 rounded-md bg-elevated">
          <div>
            <p class="text-sm font-medium">{{ ssoConfig.displayName }}</p>
            <p class="text-xs text-dimmed">
              ID {{ ssoConfig.id }} &middot; {{ ssoConfig.protocol.toUpperCase() }} &middot; {{ ssoConfig.emailDomainRestriction }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="ssoConfig.enabled ? 'success' : 'neutral'">
              {{ ssoConfig.enabled ? t('sso.enabled') : t('sso.disabled') }}
            </UBadge>
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              variant="ghost"
              @click="editConfig"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              @click="deleteConfig"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1 p-3 rounded-md bg-elevated">
          <p class="text-xs text-dimmed">{{ t('sso.callbackUrlLabel') }}</p>
          <div class="flex items-center gap-2">
            <code class="text-xs flex-1 break-all">{{ activeCallbackUrl }}</code>
            <UButton
              icon="i-lucide-copy"
              size="xs"
              variant="ghost"
              @click="copyCallbackUrl"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-if="showForm">
      <UFormField :label="t('sso.protocol')">
        <USelect
          v-model="form.protocol"
          :items="protocolOptions"
          class="w-full"
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

      <template v-if="form.protocol === 'saml'">
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
            :placeholder="t('sso.samlCertPlaceholder')"
            :rows="4"
            class="w-full"
          />
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
            :ui="{
              trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
            }"
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
                  :placeholder="t('sso.samlSigningKeyPlaceholder')"
                  :rows="4"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('sso.samlSigningCert')">
                <UTextarea
                  v-model="form.samlSigningCert"
                  :placeholder="t('sso.samlSigningCertPlaceholder')"
                  :rows="4"
                  class="w-full"
                />
              </UFormField>
            </div>
          </template>
        </UCollapsible>
      </template>

      <template v-if="form.protocol === 'oidc'">
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
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('sso.oidcCallbackUrl')">
          <UInput
            v-model="form.oidcCallbackUrl"
            :placeholder="callbackUrlPlaceholder"
            class="w-full"
          />
        </UFormField>
      </template>

      <div class="flex gap-2">
        <UButton
          :label="isEditing ? t('sso.save') : t('sso.create')"
          :loading="saving"
          @click="saveConfig"
        />
        <UButton
          :label="t('sso.cancel')"
          variant="ghost"
          color="neutral"
          @click="cancelForm"
        />
      </div>
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
import type { SsoConfig } from 'taskview-api/src/api/sso.types'

const props = defineProps<{
  organizationId: number
}>()

const { t } = useI18n()
const toast = useToast()
const { mainServer } = storeToRefs(additionalUrlStore())

const ssoConfig = ref<SsoConfig | null>(null)
const showForm = ref(false)
const saving = ref(false)
const syncing = ref(false)
const isEditing = ref(false)
const metadataUrl = ref('')

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

const protocolOptions = [
  { label: 'SAML 2.0', value: 'saml' },
  { label: 'OpenID Connect', value: 'oidc' },
]

const apiBaseUrl = computed(() => mainServer.value || window.location.origin)

const callbackUrlPlaceholder = computed(() => {
  const configId = ssoConfig.value?.id ?? '{id}'
  return `${apiBaseUrl.value}/module/sso/callback/${configId}`
})

const activeCallbackUrl = computed(() => {
  if (!ssoConfig.value) return ''
  return `${apiBaseUrl.value}/module/sso/callback/${ssoConfig.value.id}`
})

async function syncMetadata() {
  if (!metadataUrl.value.trim()) {
    toast.add({ title: t('sso.metadataUrlRequired'), color: 'warning' })
    return
  }

  syncing.value = true

  try {
    const result = await $tvApi.sso.parseMetadata(metadataUrl.value.trim())
    if (result.samlEntryPoint) form.samlEntryPoint = result.samlEntryPoint
    if (result.samlCert) form.samlCert = result.samlCert
    if (result.samlLogoutUrl) form.samlLogoutUrl = result.samlLogoutUrl
    toast.add({ title: t('sso.metadataSynced'), color: 'success' })
  } catch {
    toast.add({ title: t('sso.metadataSyncFailed'), color: 'error' })
  } finally {
    syncing.value = false
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

function copyCallbackUrl() {
  copyToClipboard(activeCallbackUrl.value)
}

function copyOpenSslCommand() {
  copyToClipboard('openssl req -x509 -newkey rsa:2048 -keyout sp-key.pem -out sp-cert.pem -days 3650 -nodes -subj "/CN=taskview"')
}

onMounted(async () => {
  await useAdditionalServer()
})

watch(() => props.organizationId, () => {
  fetchConfig()
}, { immediate: true })

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
  form.samlCert = ssoConfig.value.samlCert ?? ''
  form.samlCallbackUrl = ssoConfig.value.samlCallbackUrl ?? ''
  form.samlSigningKey = ssoConfig.value.samlSigningKey ?? ''
  form.samlSigningCert = ssoConfig.value.samlSigningCert ?? ''
  form.samlLogoutUrl = ssoConfig.value.samlLogoutUrl ?? ''
  form.oidcIssuer = ssoConfig.value.oidcIssuer ?? ''
  form.oidcClientId = ssoConfig.value.oidcClientId ?? ''
  form.oidcClientSecret = ssoConfig.value.oidcClientSecret ?? ''
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
    const axiosError = error as { response?: { status?: number, data?: { response?: { message?: string } } } }
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
