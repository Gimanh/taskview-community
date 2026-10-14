<template>
  <div
    v-if="canViewGraph"
    class="w-full h-fit rounded-2xl bg-accented/20 p-3.5"
    data-testid="task-dependencies"
  >
    <label class="text-sm text-muted mb-2 block">{{ t('tasks.dependencies.title') }}</label>

    <div class="grid grid-cols-1 @lg:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
      <TaskDependencyGroup
        :title="t('tasks.dependencies.previous')"
        icon="i-lucide-move-left"
        direction="previous"
        :entries="previous"
        :goal-id="goalId"
        :excluded-ids="excludedIds"
        :can-manage="canManageGraph"
        @open="openTask"
        @add="(task) => addEdge({ source: task.id, target: taskId, task })"
        @created="(task) => placeOnGraph({ task, side: 'before' })"
        @remove="removeEdge"
      />

      <div class="hidden @lg:flex flex-col items-center self-center text-dimmed">
        <UIcon
          name="i-lucide-git-commit-horizontal"
          class="size-5"
        />
      </div>

      <TaskDependencyGroup
        :title="t('tasks.dependencies.next')"
        icon="i-lucide-move-right"
        direction="next"
        :entries="next"
        :goal-id="goalId"
        :excluded-ids="excludedIds"
        :can-manage="canManageGraph"
        @open="openTask"
        @add="(task) => addEdge({ source: taskId, target: task.id, task })"
        @created="(task) => placeOnGraph({ task, side: 'after' })"
        @remove="removeEdge"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GraphResponseAddEdge } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useGraphStore } from '@/stores/graph.store'
import TaskDependencyGroup from './TaskDependencyGroup.vue'
import type { DependencyEdgeAddArgs, DependencyEntry, DependencyPlaceOnGraphArgs, DependencyTask } from './TaskDependencies.types'

const props = defineProps<{
  taskId: number
  goalId: number
}>()

const { t } = useI18n()
const toast = useToast()
const { canViewGraph, canManageGraph } = useGoalPermissions()
const { openTask } = useTaskDetailPanel()
const graphStore = useGraphStore()

const edges = ref<GraphResponseAddEdge[]>([])
const taskNames = ref(new Map<number, DependencyTask>())

const taskEdges = computed(() =>
  edges.value.filter((e) => e.fromTaskId === props.taskId || e.toTaskId === props.taskId),
)

function toEntries(direction: 'previous' | 'next'): DependencyEntry[] {
  return taskEdges.value
    .filter((e) => (direction === 'previous' ? e.toTaskId === props.taskId : e.fromTaskId === props.taskId))
    .map((e) => {
      const linkedId = direction === 'previous' ? e.fromTaskId : e.toTaskId
      const task = taskNames.value.get(linkedId)
      return task ? { edgeId: e.id, task } : null
    })
    .filter((entry): entry is DependencyEntry => entry !== null)
}

const previous = computed(() => toEntries('previous'))
const next = computed(() => toEntries('next'))

const excludedIds = computed(() => [
  props.taskId,
  ...taskEdges.value.flatMap((e) => [e.fromTaskId, e.toTaskId]),
])

async function resolveNames() {
  const ids = new Set(
    taskEdges.value.flatMap((e) => [e.fromTaskId, e.toTaskId]).filter((id) => id !== props.taskId),
  )
  await Promise.all(
    [...ids]
      .filter((id) => !taskNames.value.has(id))
      .map(async (id) => {
        const task = await $tvApi.tasks.fetchTaskById(id).catch((err: unknown) => logError(err))
        if (task) taskNames.value.set(id, { id: task.id, description: task.description, complete: task.complete })
      }),
  )
}

async function load() {
  const result = await $tvApi.graph.fetchTaskEdges(props.taskId).catch((err: unknown) => logError(err))
  edges.value = result ?? []
  await resolveNames()
}

watch(() => props.taskId, load, { immediate: true })

async function addEdge({ source, target, task }: DependencyEdgeAddArgs) {
  const edge = await $tvApi.graph.addEdge({ source, target }).catch((err: unknown) => logError(err))
  if (!edge) {
    toast.add({ title: t('tasks.dependencies.addFailed'), color: 'error' })
    return
  }
  taskNames.value.set(task.id, task)
  edges.value.push(edge)
  graphStore.insertEdge(edge)
}

// A task created from the picker goes onto the open graph right next to this task,
// before its edge is added, so the edge has both ends on screen
function placeOnGraph({ task, side }: DependencyPlaceOnGraphArgs) {
  const position = graphStore.positionNear({ taskId: props.taskId, task, side })
  graphStore.insertTask({ task, position })
  if (position) void graphStore.updateTaskPosition({ id: task.id, nodeGraphPosition: position })
}

async function removeEdge(edgeId: number) {
  const result = await $tvApi.graph.deleteEdge(edgeId).catch((err: unknown) => logError(err))
  if (!result) return
  edges.value = edges.value.filter((e) => e.id !== edgeId)
  graphStore.removeEdge(edgeId)
}
</script>
