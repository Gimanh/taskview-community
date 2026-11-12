import type { ProjectDashboardRunwayDay } from '@/types/project-dashboard.types'

export type ProjectDashboardRunwayDayView = ProjectDashboardRunwayDay & {
  number: number
  weekday: string
  title: string
}
