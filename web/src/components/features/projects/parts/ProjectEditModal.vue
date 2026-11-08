<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isFullscreenModal"
  >
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
        <UFormField
          :label="t('projects.color')"
          :description="t('projects.colorHint')"
        >
          <TvColorPresetPicker
            v-model="form.color"
            clearable
            picker-test-id="project-edit-color"
          />
        </UFormField>
        <UFormField
          :label="t('projects.theme')"
          :description="t('projects.themeHint')"
        >
          <ProjectThemePicker
            v-model="theme"
            class="mt-1"
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
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Project, ProjectSaveData } from '@/components/features/projects/types'
import TvColorPresetPicker from '@/components/features/base/TvColorPresetPicker.vue'
import { projectColor } from '@/helpers/color'
import { useTaskView } from '@/composables/useTaskView'
import { useProjectTheme } from '@/composables/useProjectTheme'
import ProjectThemePicker from './ProjectThemePicker.vue'
import type { ProjectTheme } from 'taskview-api'

const props = defineProps<{
  project: Project | null
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  save: [data: ProjectSaveData]
}>()

const { t } = useI18n()
const { isFullscreenModal } = useTaskView()
const { projectThemeOf, setProjectTheme } = useProjectTheme()

const theme = ref<ProjectTheme | null>(null)

const form = reactive<ProjectSaveData>({
  name: '',
  description: '',
  estimateUnit: 'points',
  color: null,
})

const estimateUnitItems = computed(() => [
  { label: t('projects.estimateUnitPoints'), value: 'points' as const },
  { label: t('projects.estimateUnitHours'), value: 'hours' as const },
])

watch(
  () => [props.project, isOpen.value] as const,
  ([project]) => {
    if (project) {
      form.name = project.name
      form.description = project.description || ''
      form.estimateUnit = project.estimateUnit ?? 'points'
      form.color = projectColor(project)
      theme.value = projectThemeOf(project.id)
    }
  },
  { immediate: true },
)

function close() {
  isOpen.value = false
}

function save() {
  const project = props.project
  if (project && JSON.stringify(theme.value) !== JSON.stringify(projectThemeOf(project.id))) {
    setProjectTheme({ projectId: project.id, theme: theme.value })
  }
  emit('save', { name: form.name, description: form.description, estimateUnit: form.estimateUnit, color: form.color })
  close()
}
</script>
