<template>
  <UButton
    color="neutral"
    variant="ghost"
    class="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 px-2 text-left"
  >
    <UIcon
      :name="status.icon"
      class="size-4 shrink-0"
      :class="[status.iconClass, { 'mt-0.5 self-start': showProject }]"
    />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-sm font-normal text-highlighted">{{ item.description }}</span>
      <span
        v-if="showProject"
        class="flex min-w-0 items-center gap-1.5 text-xs font-normal text-muted"
      >
        <span
          class="size-1.5 shrink-0 rounded-full bg-inverted/40"
          :style="projectDotStyle"
        />
        <span class="truncate">{{ project?.name }}</span>
      </span>
    </span>
    <span
      v-if="status.label"
      class="shrink-0 text-right text-xs font-normal whitespace-nowrap tabular-nums"
      :class="status.labelClass"
    >{{ status.label }}</span>
    <span
      v-if="reserveAssignee"
      class="flex size-5 shrink-0 items-center justify-center"
    >
      <UAvatar
        v-if="item.assigneeEmail"
        :alt="item.assigneeEmail"
        :title="item.assigneeEmail"
        :text="item.assigneeEmail.slice(0, 2).toUpperCase()"
        size="2xs"
      />
      <span
        v-else
        class="text-xs font-normal text-dimmed"
      >—</span>
    </span>
  </UButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectDashboardTaskStatus } from '@/composables/useProjectDashboardTaskStatus'
import { projectColor } from '@/helpers/color'
import { useGoalsStore } from '@/stores/goals.store'
import type { ProjectDashboardListedItem } from '@/types/project-dashboard.types'

const props = defineProps<{
  item: ProjectDashboardListedItem
  // The task is due today and still on time
  dueToday?: boolean
  // Name the project of the task: the list mixes tasks of several projects
  showProject?: boolean
  // Keep the assignee slot even when the task has none, so the rows of a list line up
  reserveAssignee?: boolean
}>()

const goalsStore = useGoalsStore()
const { taskStatus } = useProjectDashboardTaskStatus()

const status = computed(() => taskStatus({ item: props.item, dueToday: props.dueToday }))
const project = computed(() => goalsStore.goalMap.get(props.item.goalId))
const projectDotStyle = computed(() => {
  const color = projectColor(project.value)
  return color ? { backgroundColor: color } : undefined
})
</script>
