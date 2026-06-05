import { useI18n } from 'vue-i18n'
import type { SprintStatus } from 'taskview-api'
import type { SprintTask } from '@/types/sprints.types'

export type EstimateUnit = 'hours' | 'points'

type BadgeColor = 'neutral' | 'primary' | 'info' | 'warning' | 'success' | 'error'

export function useSprintFormat() {
  const { t } = useI18n()

  const STATUS_COLORS: Record<SprintStatus, BadgeColor> = {
    draft: 'neutral',
    planned: 'info',
    active: 'primary',
    review: 'warning',
    completed: 'success',
  }

  function statusColor(status: SprintStatus): BadgeColor {
    return STATUS_COLORS[status] ?? 'neutral'
  }

  /** Display label for the project's estimate unit. */
  function unitLabel(unit: EstimateUnit, short = false): string {
    if (unit === 'hours') {
      return short ? t('sprints.units.hoursShort') : t('sprints.units.hours')
    }
    return short ? t('sprints.units.pointsShort') : t('sprints.units.points')
  }

  /** Coerce a numeric string (e.g. "80.00") or null into a number. */
  function toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  /** Sum estimate_value (story points) of tasks. */
  function sumEstimatePoints(tasks: SprintTask[]): number {
    return tasks.reduce((total, task) => total + toNumber(task.estimateValue), 0)
  }

  /** Capacity utilization ratio in [0, ∞); null when capacity is unknown. */
  function capacityUtilization(used: number, capacity: string | number | null | undefined): number | null {
    const cap = toNumber(capacity)
    if (cap <= 0) return null
    return used / cap
  }

  function formatPoints(points: number): string {
    return Number.isInteger(points) ? String(points) : points.toFixed(1)
  }

  return { statusColor, unitLabel, toNumber, sumEstimatePoints, capacityUtilization, formatPoints }
}
