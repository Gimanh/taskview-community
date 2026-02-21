<template>
  <div class="flex flex-col gap-2">
    <ProjectsList
      :projects="activeProjects"
      @save="handleSave"
      @delete="handleDelete"
      @archive="handleArchive"
      @add="handleAdd"
    />
    <ArchiveList
      :projects="archivedProjects"
      @save="handleSave"
      @delete="handleDelete"
      @restore="handleRestore"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useGoalsStore } from '@/stores/goals.store'
import ProjectsList from '@/components/features/projects/ProjectsList.vue'
import ArchiveList from '@/components/features/projects/ArchiveList.vue'
import type { Project } from '@/components/features/projects/types'
import { ALL_TASKS_LIST_ID } from 'taskview-api'

const router = useRouter()

const goalsStore = useGoalsStore()
const { goals } = storeToRefs(goalsStore)

const activeProjects = computed(() => goals.value.filter(p => p.archive === 0))
const archivedProjects = computed(() => goals.value.filter(p => p.archive === 1))

onMounted(async () => {
  await goalsStore.fetchGoals()
})

async function handleSave(project: Project, data: { name: string; description: string }) {
  await goalsStore.updateGoal({
    id: project.id,
    name: data.name,
    description: data.description,
  })
}

async function handleDelete(project: Project) {
  await goalsStore.deleteGoal(project.id)
}

async function handleArchive(project: Project) {
  await goalsStore.updateGoal({
    id: project.id,
    archive: 1,
  })
}

async function handleRestore(project: Project) {
  await goalsStore.updateGoal({
    id: project.id,
    archive: 0,
  })
}

async function handleAdd(name: string) {
  const newProject = await goalsStore.addGoal({ name })
  if (newProject) {
    router.push({ name: 'user', params: { projectId: newProject.id, listId: ALL_TASKS_LIST_ID } })
  }
}
</script>
