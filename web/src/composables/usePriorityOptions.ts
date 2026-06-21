import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskBase } from 'taskview-api'
import { PRIORITY_COLORS } from '@/types/tasks.types'

export type PriorityId = NonNullable<TaskBase['priorityId']>
export type PriorityValue = PriorityId | null | undefined

export type PriorityOption = {
  value: PriorityId
  label: string
  description?: string
  color: string
  icon: string
  /** Tailwind text-color class for the flag icon (exact priority color). */
  iconClass: string
}

export function usePriorityOptions() {
  const { t } = useI18n()

  const options = computed<PriorityOption[]>(() => [
    {
      value: 3, label: t('tasks.priorityHigh'),
      //description: t('tasks.priorityHighDesc'), 
      color: PRIORITY_COLORS['3'].color, icon: 'i-lucide-flag', iconClass: 'text-[#FF1744]'
    },
    {
      value: 2, label: t('tasks.priorityMedium'),
      // description: t('tasks.priorityMediumDesc'), 
      color: PRIORITY_COLORS['2'].color, icon: 'i-lucide-flag', iconClass: 'text-[#FF9100]'
    },
    {
      value: 1, label: t('tasks.priorityLow'),
      // description: t('tasks.priorityLowDesc'), 
      color: PRIORITY_COLORS['1'].color, icon: 'i-lucide-flag', iconClass: 'text-[#38D681]'
    },
  ])

  const findOption = (value: PriorityValue): PriorityOption | undefined =>
    value == null ? undefined : options.value.find(o => o.value === value)

  return { options, findOption }
}
