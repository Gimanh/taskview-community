import type {
  Sprint,
  SprintBurndown,
  SprintCadence,
  SprintStatus,
  SprintVelocityPoint,
  SprintWithRetro,
  Task,
} from 'taskview-api'

/**
 * Tasks carry sprint-related fields at runtime (added by the backend
 * migration) that are not yet part of the shared `Task` type.
 */
export type SprintTask = Task & {
  sprintId?: number | null
  estimateValue?: string | null
  completedAt?: string | null
}

export type SprintsStoreState = {
  sprints: Sprint[]
  activeSprint: Sprint | null
  currentSprint: SprintWithRetro | null
  burndownById: Record<number, SprintBurndown>
  velocity: SprintVelocityPoint[]
  cadence: SprintCadence | null
  loading: boolean
}

export type SprintCadenceFormValue = {
  enabled: boolean
  lengthWeeks: number
  startDate: string | null
  lookahead: number
  nameTemplate: string
}

export type SprintFormValue = {
  name: string
  goalText: string
  startDate: string | null
  endDate: string | null
  capacity: number | null
}

export const SprintStatusOrder: SprintStatus[] = ['draft', 'planned', 'active', 'review', 'completed']
