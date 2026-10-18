import { $tvApi } from '@/plugins/axios'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useGraphStore } from '@/stores/graph.store'
import { useKanbanStore } from '@/stores/kanban.store'
import { useTasksStore } from '@/stores/tasks.store'
import type { RealtimeEventMap, RealtimeTaskRefresh } from '../types'

const REFRESH_DELAY_MS = 300

const scheduled = new Map<number, { timer: ReturnType<typeof setTimeout>; created: boolean }>()
const inFlight = new Map<number, { seq: number; created: boolean }>()
let refreshSeq = 0

export function handleTasksChanged(data: RealtimeEventMap['tasks.changed']) {
  for (const taskId of data.taskIds) {
    if (data.kind === 'deleted') {
      cancelRefresh(taskId)
      removeTaskEverywhere(taskId)
    } else {
      scheduleRefresh({ taskId, goalId: data.goalId, created: data.kind === 'created' })
    }
  }
}

function scheduleRefresh(request: RealtimeTaskRefresh) {
  const previous = scheduled.get(request.taskId)
  if (previous) clearTimeout(previous.timer)

  const created = request.created || !!previous?.created
  const timer = setTimeout(() => {
    scheduled.delete(request.taskId)
    void refreshTask({ ...request, created })
  }, REFRESH_DELAY_MS)
  scheduled.set(request.taskId, { timer, created })
}

function cancelRefresh(taskId: number) {
  inFlight.delete(taskId)
  const previous = scheduled.get(taskId)
  if (!previous) return
  clearTimeout(previous.timer)
  scheduled.delete(taskId)
}

function isShown(request: RealtimeTaskRefresh): boolean {
  const tasksStore = useTasksStore()
  const kanbanStore = useKanbanStore()
  if (
    tasksStore.selectedTask?.id === request.taskId
    || tasksStore.findLoadedTask(request.taskId)
    || kanbanStore.hasTask(request.taskId)
    || useGraphStore().hasTask(request.taskId)
    || useBaseScreenStore().hasTask(request.taskId)
  ) {
    return true
  }
  return request.created && [Number(tasksStore.fetchRules.goalId), kanbanStore.goalId, useGraphStore().goalId].includes(request.goalId)
}

async function refreshTask(request: RealtimeTaskRefresh) {
  if (!isShown(request)) return

  // A newer refresh of the same task supersedes the one in flight, whose
  // response may be stale — it inherits the "created" flag so the insert is not lost
  const seq = ++refreshSeq
  const created = request.created || !!inFlight.get(request.taskId)?.created
  inFlight.set(request.taskId, { seq, created })
  const task = await $tvApi.tasks.fetchTaskById(request.taskId).catch(() => null)
  if (inFlight.get(request.taskId)?.seq !== seq) return
  inFlight.delete(request.taskId)
  if (!task) return

  useTasksStore().applyRemoteTask({ task, created })
  const kanbanStore = useKanbanStore()
  kanbanStore.syncTask(task)
  if (created) kanbanStore.insertTask(task)
  const graphStore = useGraphStore()
  graphStore.syncTask(task)
  if (created) graphStore.insertTask({ task })
  useBaseScreenStore().syncTask(task)
}

function removeTaskEverywhere(taskId: number) {
  useTasksStore().removeTaskLocally(taskId)
  useKanbanStore().removeTask(taskId)
  useGraphStore().removeTask(taskId)
  useBaseScreenStore().removeTask(taskId)
}
