<template>
  <div
    v-if="canViewKanban"
    ref="kanbanContainer"
    class="flex gap-2 h-full"
    @pointermove="handlePointerMove"
    @pointerleave="boardStopScrolling"
    @pointerdown="pointerDownHandler"
    @touchend="boardStopScrolling"
  >
    <div
      v-for="status in kanbanStore.statuses"
      :key="status.id"
      class="h-full max-w-[340px] min-w-[272px] shadow-lg gap-2 flex flex-col w-[91.666667%] rounded-lg"
    >
      <div class="bg-elevated rounded-lg p-2 px-3 flex items-center text-base h-10">
        <span class="grow truncate">
          {{ t(status.name) }}
        </span>
        <KanbanTitleMenu
          v-if="status.id !== DEFAULT_ID"
          :status="status"
        />
      </div>

      <KanbanAddTask
        v-if="canAddTask"
        :goal-id="kanbanStore.goalId"
        :status-id="status.id"
      />

      <draggable
        v-bind="sortableOptions"
        :list="kanbanStore.tasksData[status.id]?.tasks"
        :data-column-id="status.id"
        :animation="150"
        class="flex gap-2 p-2 h-full flex-col overflow-auto overflow-x-hidden"
        item-key="id"
        group="kanban-tasks"
        @start="startHandler"
        @end="onDragEnd"
        @clone="onClone"
      >
        <template #item="{ element }">
          <div
            :data-order="element.kanbanOrder"
            :data-task-id="element.id"
          >
            <TaskItem
              :task="element"
              :ui="{ additionalInfo: 'flex-col items-stretch flex-nowrap' }"
              @toggle="updateTaskChecked"
            />
          </div>
        </template>

        <template #footer>
          <UButton
            v-if="kanbanStore.tasksData[status.id]?.nextCursor !== null"
            icon="i-lucide-circle-arrow-down"
            variant="soft"
            color="info"
            class="w-full mt-2"
            @click="loadMoreTasks(status.id)"
          >
            {{ t('kanban.loadMore') }}
          </UButton>
        </template>
      </draggable>
    </div>

    <KanbanAddStatus :goal-id="kanbanStore.goalId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import type { Task } from 'taskview-api'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import KanbanAddStatus from '@/components/features/kanban/parts/KanbanAddStatus.vue'
import KanbanAddTask from '@/components/features/kanban/parts/KanbanAddTask.vue'
import KanbanTitleMenu from '@/components/features/kanban/parts/KanbanTitleMenu.vue'
import TaskItem from '@/components/features/tasks/parts/TaskItem.vue'
import { useKanbanStore } from '@/stores/kanban.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { DEFAULT_ID } from '@/types/app.types'

const kanbanStore = useKanbanStore()
const tasksStore = useTasksStore()
const route = useRoute()

const { t } = useI18n()
const { canViewKanban, canAddTask, canManageKanban } = useGoalPermissions()

const kanbanContainer = ref<HTMLElement>()
const goalId = computed(() => route.params.projectId as string)

let boardScrollDirection: string | null = null
let boardScrollSpeed = 3
let boardAnimationFrameId: number | null = null
let cloneEl: HTMLElement | null = null
let dragStartPositionX: number | null = null
let speedDelta = 0

const sortableOptions = computed(() => ({
  delay: 100,
  delayOnTouchOnly: false,
  forceFallback: true,
  swapThreshold: 1,
  scroll: true,
  scrollSensitivity: 50,
  scrollSpeed: 10,
  disabled: !canManageKanban.value,
}))

const initLoadTasksForEachColumn = async () => {
  await Promise.all(kanbanStore.statuses.map((status) => {
    kanbanStore.fetchTasksForColumn(kanbanStore.goalId, status.id === DEFAULT_ID ? null : status.id, null)
  }))
}

watch(goalId, (lGoalId) => {
  kanbanStore.$reset()
  if (lGoalId) {
    kanbanStore.goalId = +lGoalId
  }
}, { immediate: true })

watch(
  () => kanbanStore.statuses,
  (statuses) => {
    if (statuses.length > 0) {
      initLoadTasksForEachColumn()
    }
  },
)

const updateTaskChecked = async (task: Task) => {
  const newStatus = !task.complete
  await tasksStore.updateTaskCompleteStatus({
    id: task.id,
    complete: newStatus,
  })

  for (const [, value] of Object.entries(kanbanStore.tasksData)) {
    if (!value) continue
    for (const t of value.tasks) {
      if (t.id === task.id) {
        t.complete = newStatus
        return
      }
    }
  }
}

const loadMoreTasks = (columnId: number) => {
  kanbanStore.fetchTasksForColumn(
    kanbanStore.goalId,
    columnId === DEFAULT_ID ? null : columnId,
    kanbanStore.tasksData[columnId]?.tasks[kanbanStore.tasksData[columnId]?.tasks.length - 1]?.kanbanOrder || null,
  )
}

const startHandler = (event: MouseEvent) => {
  event.preventDefault()
}

const onClone = (evt: { clone: HTMLElement }) => {
  cloneEl = evt.clone as HTMLElement
}

const pointerDownHandler = (event: PointerEvent) => {
  speedDelta = 0
  dragStartPositionX = event.clientX
}

const detectScrollDirectionFromStart = (clientX: number): 'right' | 'left' | undefined => {
  if (!dragStartPositionX) return

  const threshold = window.innerWidth < 1024 ? 80 : 240
  const delta = clientX - dragStartPositionX
  if (Math.abs(delta) < threshold) return

  const percentage = (100 / threshold) * (Math.abs(delta) - threshold)

  speedDelta = ((boardScrollSpeed / 100) * Math.min(percentage, 250)) / 20

  if (delta < 0) {
    return 'left'
  }
  return 'right'
}

const boardStopScrolling = () => {
  boardScrollDirection = null

  if (boardAnimationFrameId) {
    cancelAnimationFrame(boardAnimationFrameId)
    boardAnimationFrameId = null
  }
}

const handlePointerMove = (event: MouseEvent) => {
  if (!kanbanContainer.value || !cloneEl) return
  detectScrollDirectionFromStart(event.clientX)

  if (detectScrollDirectionFromStart(event.clientX) === 'right') {
    boardStartScrolling('right')
  } else if (detectScrollDirectionFromStart(event.clientX) === 'left') {
    boardStartScrolling('left')
  } else {
    boardStopScrolling()
  }
}

const boardStartScrolling = (direction: 'left' | 'right') => {
  boardScrollDirection = direction
  if (!boardAnimationFrameId) {
    boardScrollStep()
  }
}

const boardScrollStep = () => {
  if (!kanbanContainer.value || !boardScrollDirection) return

  if (boardScrollDirection === 'right') {
    kanbanContainer.value.scrollLeft += boardScrollSpeed + speedDelta
  } else if (boardScrollDirection === 'left') {
    kanbanContainer.value.scrollLeft -= boardScrollSpeed + speedDelta
  }

  boardAnimationFrameId = requestAnimationFrame(boardScrollStep)
}

function scrollToColumn(targetColumn: HTMLElement) {
  const board = kanbanContainer.value
  if (!board) return
  if (targetColumn) {
    const boardRect = board.getBoundingClientRect()
    const columnRect = targetColumn.getBoundingClientRect()

    const scrollLeft =
      board.scrollLeft + (columnRect.left - boardRect.left) - board.clientWidth / 2 + columnRect.width / 2

    board.scrollTo({
      left: scrollLeft,
      behavior: 'smooth',
    })
  }
}

async function onDragEnd(evt: {
  to: HTMLElement
  item: HTMLElement
  newDraggableIndex: number
  oldDraggableIndex: number
}) {
  cloneEl = null
  boardStopScrolling()
  const targetColumn = evt.to as HTMLElement

  const newColumnId = targetColumn.dataset.columnId

  if (newColumnId === undefined) {
    console.error('Can not find columns id in dataset for element')
    return
  }

  let taskId: string | number | undefined = (evt.item as HTMLElement).dataset.taskId

  if (taskId === undefined) {
    return
  }

  taskId = +taskId
  const newColumnIdNum = +newColumnId

  const columnTasks = kanbanStore.tasksData[newColumnIdNum]?.tasks ?? []

  const activeTasks = columnTasks.filter((task: Task) => task.id !== taskId)

  const nextItemInColumn = activeTasks[evt.newDraggableIndex] || null
  const prevItemInColumn = activeTasks[evt.newDraggableIndex - 1] || null

  await kanbanStore.updateTasksOrderAndColumn({
    taskId,
    prevTaskId: prevItemInColumn?.id ?? null,
    nextTaskId: nextItemInColumn?.id ?? null,
    columnId: newColumnIdNum === DEFAULT_ID ? null : newColumnIdNum,
    goalId: kanbanStore.goalId,
  })

  if (targetColumn) {
    scrollToColumn(targetColumn)
  }
}

onMounted(() => {
  boardScrollSpeed = window.innerWidth < 1024 ? 7 : 5
})

onUnmounted(() => {
  kanbanStore.$reset()
  boardStopScrolling()
})
</script>