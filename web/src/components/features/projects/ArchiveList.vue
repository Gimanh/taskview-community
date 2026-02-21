<template>
  <ProjectListBase
    v-model:open="open"
    :title="t('archive.title')"
    :projects="projects"
    :is-archive="true"
    data-testid="archive-list-collapsible"
    @save="handleSave"
    @delete="handleDelete"
    @restore="handleRestore"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ProjectListBase from '@/components/features/projects/parts/ProjectListBase.vue'
import type { Project } from '@/components/features/projects/types'

defineProps<{
  projects: Project[]
}>()

const emit = defineEmits<{
  save: [project: Project, data: { name: string; description: string }]
  delete: [project: Project]
  restore: [project: Project]
}>()

const { t } = useI18n()

const open = defineModel<boolean>('open', { required: false, default: false })

function handleSave(project: Project, data: { name: string; description: string }) {
  emit('save', project, data)
}

function handleDelete(project: Project) {
  emit('delete', project)
}

function handleRestore(project: Project) {
  emit('restore', project)
}
</script>
