import type { Task } from 'taskview-api'
import type { TvContextMenuPoint } from '@/components/features/base/TvContextMenu.types'

export type TaskActionsOpenMenuArgs = {
  task: Task
  point: TvContextMenuPoint
}

export type TaskActionsMenuRequest = {
  point: TvContextMenuPoint
}
