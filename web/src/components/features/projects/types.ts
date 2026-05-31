import type { GoalItem } from 'taskview-api'

export type Project = GoalItem

export type ProjectSaveData = {
  name: string
  description: string
  estimateUnit: 'hours' | 'points'
}
