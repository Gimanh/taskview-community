<template>
  <div class="flex flex-col gap-5">
    <div>
      <h2 class="text-lg font-semibold">
        {{ t('import.connect.title') }}
      </h2>
      <p class="text-sm text-muted">
        {{ t('import.connect.description') }}
      </p>
    </div>

    <div
      v-if="importStore.providersLoading"
      class="py-6 text-center text-sm text-muted"
    >
      {{ t('common.loading') }}
    </div>
    <div
      v-else-if="importStore.providers.length === 0"
      class="flex flex-col items-start gap-3"
    >
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-alert-triangle"
        :title="t('import.connect.providersFailed')"
        class="w-full"
      />
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-rotate-cw"
        :label="t('import.connect.retry')"
        @click="importStore.fetchProviders()"
      />
    </div>

    <div
      v-else
      class="grid gap-3 sm:grid-cols-2"
    >
      <UButton
        v-for="provider in importStore.providers"
        :key="provider.id"
        color="neutral"
        size="xl"
        :variant="selectedId === provider.id ? 'soft' : 'outline'"
        :icon="metaOf(provider.id).icon"
        :label="metaOf(provider.id).label"
        :data-testid="`import-provider-${provider.id}`"
        class="justify-start"
        @click="selectedId = provider.id"
      />
    </div>

    <template v-if="selected">
      <UButton
        v-if="selected.popupAuthorizeUrl && !manualMode"
        :label="t('import.connect.popup', { provider: metaOf(selected.id).label })"
        :icon="metaOf(selected.id).icon"
        :loading="importStore.loading"
        size="lg"
        block
        data-testid="import-connect-popup"
        @click="connectWithPopup"
      />

      <ImportManualCredentialsForm
        v-if="!selected.popupAuthorizeUrl || manualMode"
        :provider="selected"
        :loading="importStore.loading"
        @submit="connect"
      />

      <UButton
        v-if="selected.popupAuthorizeUrl"
        variant="link"
        color="neutral"
        size="sm"
        class="self-start"
        :label="manualMode ? t('import.connect.usePopup') : t('import.connect.useManual')"
        @click="manualMode = !manualMode"
      />

      <UAlert
        v-if="popupBlocked"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="t('import.connect.popupFailed')"
      />
      <ImportErrorAlert :code="importStore.errorCode" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useImportStore } from '@/stores/import.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useImportPopupAuth } from '@/composables/useImportPopupAuth'
import { IMPORT_PROVIDERS } from '../importProviders'
import type { ImportProviderMeta } from '../importProviders.types'
import ImportManualCredentialsForm from './ImportManualCredentialsForm.vue'
import ImportErrorAlert from './ImportErrorAlert.vue'

const emit = defineEmits<{
  connected: []
}>()

const { t } = useI18n()
const importStore = useImportStore()
const { currentOrg } = storeToRefs(useOrganizationStore())
const { authorize } = useImportPopupAuth()

const selectedId = ref<string | null>(null)
const manualMode = ref(false)
const popupBlocked = ref(false)

const selected = computed(() => importStore.providers.find((provider) => provider.id === selectedId.value) ?? null)

watch(
  () => importStore.providers,
  (providers) => {
    if (!selectedId.value && providers.length === 1) selectedId.value = providers[0].id
  },
  { immediate: true },
)

function metaOf(providerId: string): ImportProviderMeta {
  return IMPORT_PROVIDERS[providerId] ?? { label: providerId, icon: 'i-lucide-download', sourceHost: null, manualHelpUrl: null }
}

async function connectWithPopup() {
  if (!selected.value?.popupAuthorizeUrl || !selected.value.popupCredentialKey) return
  popupBlocked.value = false
  const token = await authorize(selected.value.popupAuthorizeUrl)
  if (!token) {
    popupBlocked.value = true
    return
  }
  await connect({ [selected.value.popupCredentialKey]: token })
}

async function connect(credentials: Record<string, string>) {
  if (!selected.value || !currentOrg.value) return
  const connected = await importStore.connect({
    organizationId: currentOrg.value.id,
    provider: selected.value.id,
    credentials,
  })
  if (connected) emit('connected')
}
</script>
