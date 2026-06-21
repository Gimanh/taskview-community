<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="font-semibold">
        {{ t('projects.edit') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('projects.name')">
          <UInput
            v-model="form.name"
            :placeholder="t('projects.namePlaceholder')"
            variant="soft"
            class="w-full"
            :ui="{ base: 'rounded-xl' }"
            data-testid="project-edit-name"
          />
        </UFormField>
        <UFormField :label="t('projects.description')">
          <UTextarea
            v-model="form.description"
            :placeholder="t('projects.descriptionPlaceholder')"
            :rows="3"
            variant="soft"
            class="w-full"
            :ui="{ base: 'rounded-xl' }"
          />
        </UFormField>
        <UFormField :label="t('projects.estimateUnit')">
          <USelect
            v-model="form.estimateUnit"
            :items="estimateUnitItems"
            variant="soft"
            class="w-full"
            data-testid="project-edit-estimate-unit"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 w-full justify-end">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="soft"
          @click="close"
        />
        <UButton
          :label="t('common.save')"
          color="primary"
          variant="soft"
          data-testid="project-edit-save"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Project, ProjectSaveData } from '@/components/features/projects/types'

const props = defineProps<{
  project: Project | null
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  save: [data: ProjectSaveData]
}>()

const { t } = useI18n()

const form = reactive<ProjectSaveData>({
  name: '',
  description: '',
  estimateUnit: 'points',
})

const estimateUnitItems = computed(() => [
  { label: t('projects.estimateUnitPoints'), value: 'points' as const },
  { label: t('projects.estimateUnitHours'), value: 'hours' as const },
])

watch(
  () => props.project,
  (project) => {
    if (project) {
      form.name = project.name
      form.description = project.description || ''
      form.estimateUnit = project.estimateUnit ?? 'points'
    }
  },
  { immediate: true },
)

function close() {
  isOpen.value = false
}

function save() {
  emit('save', { name: form.name, description: form.description, estimateUnit: form.estimateUnit })
  close()
}
</script>
