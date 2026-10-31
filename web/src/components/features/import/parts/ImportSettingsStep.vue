<template>
  <div
    v-if="meta && provider"
    class="flex flex-col gap-6"
  >
    <div>
      <h2 class="text-lg font-semibold">
        {{ meta.name }}
      </h2>
      <p class="text-sm text-muted">
        {{ t('import.settings.newProject') }}
      </p>
    </div>

    <ImportSummary :meta="meta" />

    <ImportOptionsForm
      v-model="options"
      :provider-id="provider.id"
      :fields="provider.options"
    />

    <ImportPeopleMapping
      v-if="meta.people.length > 0"
      v-model="people"
      :people="meta.people"
      :members="organizationStore.members"
    />

    <ImportErrorAlert :code="importStore.errorCode" />

    <div class="flex flex-wrap items-center justify-between gap-2">
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        :label="t('import.back')"
        @click="emit('back')"
      />
      <UButton
        icon="i-lucide-download"
        :label="t('import.settings.start')"
        :loading="importStore.loading"
        data-testid="import-start"
        @click="start"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportLocale, ImportOptionValues } from 'taskview-api'
import { useImportStore } from '@/stores/import.store'
import { useOrganizationStore } from '@/stores/organization.store'
import type { ImportPeopleSelection } from '../importProviders.types'
import ImportSummary from './ImportSummary.vue'
import ImportOptionsForm from './ImportOptionsForm.vue'
import ImportPeopleMapping from './ImportPeopleMapping.vue'
import ImportErrorAlert from './ImportErrorAlert.vue'

const emit = defineEmits<{
  back: []
  started: []
}>()

const { t, locale } = useI18n()
const importStore = useImportStore()
const organizationStore = useOrganizationStore()

const meta = computed(() => importStore.projectMeta)
const provider = computed(() => importStore.providers.find((item) => item.id === importStore.currentJob?.provider) ?? null)

const options = ref<ImportOptionValues>(
  Object.fromEntries((provider.value?.options ?? []).map((field) => [field.key, field.default])),
)
const people = ref<ImportPeopleSelection>({})

onMounted(() => {
  if (importStore.currentJob) organizationStore.fetchMembers(importStore.currentJob.organizationId)
})

async function start() {
  if (!meta.value) return
  const peopleMapping = Object.entries(people.value)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([externalId, organizationMemberId]) => ({ externalId, organizationMemberId }))

  const started = await importStore.start({
    externalProjectId: meta.value.externalId,
    peopleMapping,
    options: options.value,
    locale: locale.value as ImportLocale,
  })
  if (started) emit('started')
}
</script>
