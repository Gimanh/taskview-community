<template>
  <div class="flex flex-col gap-4">
    <div>
      <h2 class="text-lg font-semibold">
        {{ t('import.project.title') }}
      </h2>
      <p
        v-if="importStore.currentJob?.accountName"
        class="text-sm text-muted"
      >
        {{ t('import.project.connectedAs', { account: importStore.currentJob.accountName }) }}
      </p>
    </div>

    <UInput
      v-model="search"
      icon="i-lucide-search"
      :placeholder="t('import.project.search')"
      class="w-full"
    />

    <div
      v-if="filtered.length === 0"
      class="py-8 text-center text-sm text-muted"
    >
      {{ t('import.project.empty') }}
    </div>
    <div
      v-else
      class="flex flex-col gap-1 max-h-96 overflow-y-auto"
    >
      <UButton
        v-for="project in filtered"
        :key="project.externalId"
        color="neutral"
        variant="ghost"
        :label="project.name"
        trailing-icon="i-lucide-chevron-right"
        :loading="loadingId === project.externalId"
        :disabled="loadingId !== null"
        class="justify-between"
        data-testid="import-project-item"
        @click="select(project.externalId)"
      />
    </div>

    <ImportErrorAlert :code="importStore.errorCode" />

    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      :label="t('import.back')"
      class="self-start"
      @click="emit('back')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImportStore } from '@/stores/import.store'
import ImportErrorAlert from './ImportErrorAlert.vue'

const emit = defineEmits<{
  back: []
  selected: []
}>()

const { t } = useI18n()
const importStore = useImportStore()
const search = ref('')
const loadingId = ref<string | null>(null)

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return importStore.remoteProjects
  return importStore.remoteProjects.filter((project) => project.name.toLowerCase().includes(query))
})

async function select(externalId: string) {
  loadingId.value = externalId
  const ok = await importStore.selectProject(externalId)
  loadingId.value = null
  if (ok) emit('selected')
}
</script>
