export type TaskDetailFieldWidth = 'narrow' | 'wide'

export type TaskDetailField = {
  id: string
  width: TaskDetailFieldWidth
}

export const TASK_DETAIL_FIELDS = [
  { id: 'subtasks', width: 'wide' },
  { id: 'note', width: 'wide' },
  { id: 'status', width: 'narrow' },
  { id: 'priority', width: 'narrow' },
  { id: 'assignees', width: 'narrow' },
  { id: 'list', width: 'narrow' },
  { id: 'tags', width: 'narrow' },
  { id: 'deadline', width: 'narrow' },
  { id: 'amount', width: 'wide' },
  { id: 'timeTracking', width: 'wide' },
  { id: 'history', width: 'wide' },
] as const satisfies readonly TaskDetailField[]

export type TaskDetailFieldId = typeof TASK_DETAIL_FIELDS[number]['id']

const widthById = new Map<string, TaskDetailFieldWidth>(
  TASK_DETAIL_FIELDS.map(f => [f.id, f.width]),
)

export function taskFieldWidth(id: string): TaskDetailFieldWidth {
  return widthById.get(id) ?? 'narrow'
}
