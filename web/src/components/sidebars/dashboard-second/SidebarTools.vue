<template>
  <UCollapsible
    v-if="currentProject"
    v-model:open="open"
    class="flex flex-col gap-1 group"
    :ui="{ content: 'p-0' }"
  >
    <button
      type="button"
      class="flex items-center justify-between w-full px-2 py-1 cursor-pointer select-none"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('msg.tools') }}</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 text-muted transition-transform duration-200 group-data-[state=closed]:-rotate-90"
      />
    </button>

    <template #content>
      <div class="flex flex-col gap-0.5 pt-1">
        <UButton
          v-for="tool in tools"
          :key="tool.key"
          :label="tool.label"
          :icon="tool.icon"
          color="neutral"
          :variant="tool.active() ? 'soft' : 'ghost'"
          block
          class="justify-start"
          :ui="{ base: 'rounded-xl' }"
          :to="tool.to"
        />
      </div>
    </template>
  </UCollapsible>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import type { Project } from '@/components/features/projects/types'

type Tool = {
  key: string
  label: string
  icon: string
  to: RouteLocationRaw
  active: () => boolean
}

const { t } = useI18n()
const route = useRoute()
const goalsStore = useGoalsStore()

const open = ref(true)

const projectId = computed(() => Number(route.params.projectId) || null)
const currentProject = computed<Project | null>(() =>
  projectId.value ? goalsStore.goalMap.get(projectId.value) ?? null : null,
)

const {
  canViewKanban,
  canViewGraph,
  canViewSprints,
  canManageUsers,
  canViewIntegrations,
  canViewTimeTracking,
} = useGoalPermissionsFor(currentProject)

const tools = computed<Tool[]>(() => {
  const id = projectId.value
  if (!id) return []

  const list: Tool[] = [
    {
      key: 'tasks',
      label: t('msg.tasks'),
      icon: 'i-lucide-list-checks',
      to: { name: 'user', params: { projectId: id, listId: ALL_TASKS_LIST_ID } },
      active: () => route.name === 'user',
    },
  ]

  if (canViewKanban.value) {
    list.push({ key: 'kanban', label: t('contextMenu.kanban'), icon: 'i-lucide-kanban', to: { name: 'kanban', params: { projectId: id } }, active: () => route.name === 'kanban' })
  }
  if (canViewGraph.value) {
    list.push({ key: 'graph', label: t('contextMenu.graph'), icon: 'i-lucide-git-graph', to: { name: 'graph', params: { projectId: id } }, active: () => route.name === 'graph' })
  }
  if (canViewSprints.value) {
    list.push({ key: 'sprints', label: t('contextMenu.sprints'), icon: 'i-lucide-rocket', to: { name: 'sprints', params: { projectId: id } }, active: () => route.name === 'sprints' })
  }
  if (canManageUsers.value) {
    list.push({ key: 'collaboration', label: t('contextMenu.collaboration'), icon: 'i-lucide-users', to: { name: 'collaboration', params: { projectId: id } }, active: () => route.name === 'collaboration' })
  }
  if (canViewIntegrations.value) {
    list.push({ key: 'webhooks', label: t('contextMenu.webhooks'), icon: 'i-lucide-webhook', to: { name: 'webhooks', params: { projectId: id } }, active: () => route.name === 'webhooks' })
    list.push({ key: 'integrations', label: t('contextMenu.integrations'), icon: 'i-lucide-plug', to: { name: 'integrations', params: { projectId: id } }, active: () => route.name === 'integrations' })
  }
  if (canViewTimeTracking.value) {
    list.push({ key: 'timeReports', label: t('contextMenu.timeReports'), icon: 'i-lucide-clock', to: { name: 'project-time-reports', params: { projectId: id } }, active: () => route.name === 'project-time-reports' })
  }

  return list
})
</script>
