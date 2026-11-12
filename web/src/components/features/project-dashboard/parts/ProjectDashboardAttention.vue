<template>
  <ProjectDashboardCard
    :title="t('projectDashboard.attention.title')"
    :meta="total > items.length ? t('projectDashboard.attention.shown', { shown: items.length, total }) : undefined"
    data-testid="project-dashboard-attention"
  >
    <ul
      v-if="items.length"
      class="flex flex-1 flex-col divide-y divide-default"
    >
      <li
        v-for="item in items"
        :key="item.taskId"
      >
        <ProjectDashboardTaskRow
          :item="item"
          due-today
          :show-project="showProject"
          :reserve-assignee="hasAssignees"
          :data-testid="`project-dashboard-attention-task-${item.taskId}`"
          @click="openTask(item.taskId)"
        />
      </li>
    </ul>
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted"
      data-testid="project-dashboard-attention-empty"
    >
      <UIcon
        name="i-lucide-circle-check"
        class="size-6 text-success"
      />
      {{ t('projectDashboard.attention.empty') }}
    </div>
  </ProjectDashboardCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import type { ProjectDashboardAttentionItem } from '@/types/project-dashboard.types'
import ProjectDashboardCard from './ProjectDashboardCard.vue'
import ProjectDashboardTaskRow from './ProjectDashboardTaskRow.vue'

const props = defineProps<{
  items: ProjectDashboardAttentionItem[]
  total: number
  // Name the project of each task: the list mixes tasks of several projects
  showProject?: boolean
}>()

const { t } = useI18n()
const { openTask } = useTaskDetailPanel()

// The assignee slot is kept in every row once any row has one, so the due labels line up
const hasAssignees = computed(() => props.items.some((item) => item.assigneeEmail))
</script>
