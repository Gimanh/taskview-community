<template>
  <UModal
    v-model:open="isOpen"
    :title="t('projects.theme')"
    :description="t('projects.themeHint')"
    :fullscreen="isFullscreenModal"
  >
    <template #body>
      <ProjectThemePicker v-model="theme" />
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="soft"
          @click="isOpen = false"
        />
        <UButton
          :label="t('common.save')"
          color="primary"
          variant="soft"
          data-testid="project-theme-save"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectTheme } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'
import { useProjectTheme } from '@/composables/useProjectTheme'
import ProjectThemePicker from './ProjectThemePicker.vue'

const props = defineProps<{
  projectId: number
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { isFullscreenModal } = useTaskView()
const { projectThemeOf, setProjectTheme } = useProjectTheme()

const theme = ref<ProjectTheme | null>(null)

watch(isOpen, (open) => {
  if (open) theme.value = projectThemeOf(props.projectId)
}, { immediate: true })

function save() {
  setProjectTheme({ projectId: props.projectId, theme: theme.value })
  isOpen.value = false
}
</script>
