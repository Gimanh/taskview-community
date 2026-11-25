import { computed } from 'vue'
import { getTaskDetailFieldProviders } from '@/extensions/registry'
import type { TaskDetailFieldExtension } from '@/extensions/types'

export function useTaskDetailExtensionFields() {
  const provided = getTaskDetailFieldProviders().map((provide) => provide())
  return computed<TaskDetailFieldExtension[]>(() => provided.flatMap((fields) => fields.value))
}
