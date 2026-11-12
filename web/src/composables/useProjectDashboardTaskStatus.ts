import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectDashboardTaskStatus, ProjectDashboardTaskStatusArgs } from '@/types/project-dashboard.types'

// What a listed task says about itself on the right of its row: how late it is, that it is due today, or when it was completed
export function useProjectDashboardTaskStatus() {
  const { t, locale } = useI18n()
  const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }))

  function taskStatus({ item, dueToday }: ProjectDashboardTaskStatusArgs): ProjectDashboardTaskStatus {
    if (item.completedOn) {
      return {
        label: dayFormat.value.format(new Date(`${item.completedOn}T00:00:00`)),
        labelClass: 'text-muted',
        icon: 'i-lucide-circle-check',
        iconClass: 'text-success',
      }
    }
    if (item.daysLate >= 0) {
      return {
        label: item.daysLate > 0
          ? t('projectDashboard.attention.daysLate', { count: item.daysLate })
          : t('projectDashboard.attention.late'),
        labelClass: 'text-error',
        icon: 'i-lucide-circle-alert',
        iconClass: 'text-error',
      }
    }
    if (dueToday) {
      return {
        label: t('projectDashboard.attention.today'),
        labelClass: 'text-warning',
        icon: 'i-lucide-timer',
        iconClass: 'text-warning',
      }
    }
    return { label: '', labelClass: '', icon: 'i-lucide-calendar', iconClass: 'text-muted' }
  }

  return { taskStatus }
}
