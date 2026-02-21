<template>
  <ProjectListBase
    v-model:open="open"
    :title="t('projects.title')"
    :projects="projects"
    @save="handleSave"
    @delete="handleDelete"
    @archive="handleArchive"
    @add="handleAdd"
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
  archive: [project: Project]
  add: [name: string]
}>()

const { t } = useI18n()

const open = defineModel<boolean>('open', { required: false, default: true })

function handleSave(project: Project, data: { name: string; description: string }) {
  emit('save', project, data)
}

function handleDelete(project: Project) {
  emit('delete', project)
}

function handleArchive(project: Project) {
  emit('archive', project)
}

function handleAdd(name: string) {
  emit('add', name)
}
</script>
