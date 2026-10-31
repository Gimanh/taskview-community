<template>
  <div class="flex flex-col gap-6 p-4 lg:p-6 max-w-3xl w-full mx-auto">
    <UStepper
      v-model="step"
      :items="stepItems"
      disabled
      size="sm"
      class="w-full"
    />

    <UCard>
      <ImportConnectStep
        v-if="step === 'connect'"
        @connected="step = 'project'"
      />
      <ImportProjectStep
        v-else-if="step === 'project'"
        @back="restart"
        @selected="step = 'settings'"
      />
      <ImportSettingsStep
        v-else-if="step === 'settings'"
        @back="step = 'project'"
        @started="step = 'progress'"
      />
      <ImportProgressStep
        v-else
        @restart="restart"
      />
    </UCard>

    <ImportHistory />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useImportStore } from '@/stores/import.store'
import { useOrganizationStore } from '@/stores/organization.store'
import ImportConnectStep from './parts/ImportConnectStep.vue'
import ImportProjectStep from './parts/ImportProjectStep.vue'
import ImportSettingsStep from './parts/ImportSettingsStep.vue'
import ImportProgressStep from './parts/ImportProgressStep.vue'
import ImportHistory from './parts/ImportHistory.vue'
import type { ImportWizardStep } from './importProviders.types'

const { t } = useI18n()
const importStore = useImportStore()
const { currentOrg } = storeToRefs(useOrganizationStore())
const step = ref<ImportWizardStep>('connect')

const stepItems = computed(() => [
  { value: 'connect', title: t('import.steps.connect'), icon: 'i-lucide-plug' },
  { value: 'project', title: t('import.steps.project'), icon: 'i-lucide-layout-grid' },
  { value: 'settings', title: t('import.steps.settings'), icon: 'i-lucide-sliders-horizontal' },
  { value: 'progress', title: t('import.steps.progress'), icon: 'i-lucide-download' },
])

function restart() {
  importStore.reset()
  step.value = 'connect'
}

watch(
  () => currentOrg.value?.id,
  (organizationId) => {
    if (importStore.currentJob && importStore.currentJob.organizationId !== organizationId) restart()
    if (organizationId) importStore.fetchJobs(organizationId)
  },
  { immediate: true },
)

onMounted(() => {
  importStore.fetchProviders()
  if (importStore.currentJob && importStore.currentJob.status !== 'draft') step.value = 'progress'
})
</script>
