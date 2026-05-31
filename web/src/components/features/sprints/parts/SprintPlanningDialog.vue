<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :ui="{ content: 'lg:max-w-4xl' }"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-semibold">
              {{ t('sprints.planning.title') }}
            </h3>
            <div class="flex items-center gap-3">
              <span
                class="text-sm font-medium"
                :class="overCapacity ? 'text-error' : 'text-muted'"
              >
                {{ formatPoints(totalPoints) }} / {{ capacityLabel }} {{ unitLabel(unit) }}
              </span>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                @click="open = false"
              />
            </div>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SprintPlanningColumn
            :title="t('sprints.planning.backlog')"
            :empty-label="t('sprints.planning.backlogEmpty')"
            :tasks="backlog.tasks"
            :unit="unit"
            direction="forward"
            :loading="backlog.loading"
            :has-more="backlog.cursor !== undefined ? backlog.nextCursor !== null : true"
            :error="backlog.errored"
            :busy-id="busyId"
            @assign="(task) => assign(task, sprint.id)"
            @load-more="() => loadPage('backlog')"
            @retry="() => loadPage('backlog')"
          />

          <SprintPlanningColumn
            :title="t('sprints.planning.inSprint')"
            :empty-label="t('sprints.planning.sprintEmpty')"
            :tasks="sprint_.tasks"
            :unit="unit"
            direction="back"
            :loading="sprint_.loading"
            :has-more="sprint_.cursor !== undefined ? sprint_.nextCursor !== null : true"
            :error="sprint_.errored"
            :busy-id="busyId"
            @assign="(task) => assign(task, null)"
            @load-more="() => loadPage('sprint')"
            @retry="() => loadPage('sprint')"
          />
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sprint, SprintPlanningScope, SprintPlanningSprintPage } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'
import { useSprintsStore } from '@/stores/sprints.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useSprintFormat } from '../composables/useSprintFormat'
import SprintPlanningColumn from './SprintPlanningColumn.vue'
import type { SprintTask } from '@/types/sprints.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  sprint: Sprint
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const toast = useToast()
const sprintsStore = useSprintsStore()
const goalsStore = useGoalsStore()
const { formatPoints, toNumber, capacityUtilization, unitLabel } = useSprintFormat()

const PAGE_SIZE = 30

const unit = computed(() => goalsStore.goalMap.get(props.sprint.goalId)?.estimateUnit ?? 'points')

type ColumnState = {
  tasks: SprintTask[]
  // cursor === undefined means no page has been loaded yet (hasMore is true).
  cursor: number | undefined
  nextCursor: number | null
  loading: boolean
  // a failed request stops auto-loading and surfaces a Retry button
  errored: boolean
}

function emptyColumn(): ColumnState {
  return { tasks: [], cursor: undefined, nextCursor: null, loading: false, errored: false }
}

const backlog = reactive<ColumnState>(emptyColumn())
const sprint_ = reactive<ColumnState>(emptyColumn())
const totalPoints = ref(0)
const busyId = ref<number | null>(null)

function columnFor(scope: SprintPlanningScope): ColumnState {
  return scope === 'backlog' ? backlog : sprint_
}

function reset() {
  Object.assign(backlog, emptyColumn())
  Object.assign(sprint_, emptyColumn())
  totalPoints.value = 0
  busyId.value = null
}

async function loadPage(scope: SprintPlanningScope) {
  const column = columnFor(scope)
  if (column.loading) return
  // Stop once a page has been loaded and the server reports no more.
  if (column.cursor !== undefined && column.nextCursor === null) return

  column.loading = true
  column.errored = false
  try {
    const page = await sprintsStore.fetchPlanningTasks({
      sprintId: props.sprint.id,
      scope,
      cursor: column.cursor,
      limit: PAGE_SIZE,
    })
    if (!page) {
      column.errored = true
      return
    }
    column.tasks.push(...(page.tasks as SprintTask[]))
    column.nextCursor = page.nextCursor
    column.cursor = page.nextCursor ?? column.cursor ?? -1
    if (scope === 'sprint') totalPoints.value = (page as SprintPlanningSprintPage).totalPoints
  } catch {
    column.errored = true
  } finally {
    column.loading = false
  }
}

const utilization = computed(() => capacityUtilization(totalPoints.value, props.sprint.capacity))
const overCapacity = computed(() => utilization.value !== null && utilization.value > 1)
const capacityLabel = computed(() => {
  const cap = toNumber(props.sprint.capacity)
  return cap > 0 ? formatPoints(cap) : '—'
})

async function assign(task: SprintTask, sprintId: number | null) {
  busyId.value = task.id
  try {
    const ok = await sprintsStore.setTaskSprint({ taskId: task.id, sprintId })
    if (!ok) {
      toast.add({ title: t('sprints.toasts.assignFailed'), color: 'error' })
      return
    }
    const points = toNumber(task.estimateValue)
    const moving: SprintTask = { ...task, sprintId }
    if (sprintId === null) {
      // Moving out of the sprint, back to backlog.
      removeFromColumn(sprint_, task.id)
      backlog.tasks.unshift(moving)
      totalPoints.value = Math.max(0, totalPoints.value - points)
    } else {
      // Moving into the sprint.
      removeFromColumn(backlog, task.id)
      sprint_.tasks.unshift(moving)
      totalPoints.value += points
    }
    emit('changed')
  } finally {
    busyId.value = null
  }
}

function removeFromColumn(column: ColumnState, taskId: number) {
  const index = column.tasks.findIndex((item) => item.id === taskId)
  if (index !== -1) column.tasks.splice(index, 1)
}

watch(
  () => [open.value, props.sprint.id] as const,
  ([isOpen], previous) => {
    const wasOpen = previous?.[0]
    if (isOpen) {
      reset()
      loadPage('backlog')
      loadPage('sprint')
    } else if (wasOpen) {
      reset()
    }
  },
  { immediate: true },
)
</script>
