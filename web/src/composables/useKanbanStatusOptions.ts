import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKanbanStore } from '@/stores/kanban.store'
import { useProjectContext } from '@/composables/useProjectContext'
import { DEFAULT_ID } from '@/types/app.types'
import type { TvDropdownOption } from '@/types/tvDropdown.types'

export type StatusValue = number | null

export function useKanbanStatusOptions() {
  const { t } = useI18n()
  const kanbanStore = useKanbanStore()
  const projectContext = useProjectContext()

  const statuses = computed(() =>
    projectContext ? projectContext.statuses.value : kanbanStore.statuses,
  )

  const resolveLabel = (name: string): string => (name.startsWith('msg.') ? t(name) : name)

  const options = computed<TvDropdownOption<StatusValue>[]>(() =>
    statuses.value.map(status => ({
      value: status.id === DEFAULT_ID ? null : status.id,
      label: resolveLabel(status.name),
      icon: 'i-lucide-circle-dot',
      iconClass: 'text-dimmed',
    })),
  )

  const findOption = (value: StatusValue): TvDropdownOption<StatusValue> | undefined =>
    options.value.find(o => o.value === value)

  return { options, findOption }
}
