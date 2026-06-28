import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGoalListsStore } from '@/stores/goal-lists.store'
import { useProjectContext } from '@/composables/useProjectContext'

export type ListValue = number | null

export type ListOption = {
  value: ListValue
  label: string
  icon: string
  iconClass: string
}

export function useGoalListOptions() {
  const { t } = useI18n()
  const goalListsStore = useGoalListsStore()
  const projectContext = useProjectContext()

  const lists = computed(() => projectContext?.lists.value ?? goalListsStore.lists)

  const options = computed<ListOption[]>(() => [
    { value: null, label: t('tasks.noList'), icon: 'i-lucide-inbox', iconClass: 'text-dimmed' },
    ...lists.value.map(list => ({ value: list.id, label: list.name, icon: 'i-lucide-list', iconClass: 'text-dimmed' })),
  ])

  const findOption = (value: ListValue): ListOption | undefined =>
    options.value.find(o => o.value === value)

  return { options, findOption }
}
