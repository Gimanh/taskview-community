import type { Task } from 'taskview-api'
import type { GraphPlacementSide } from '@/types/graph.types'

export type DependencyTask = {
  id: number
  description: string
  complete: number | boolean
}

export type DependencyEntry = {
  edgeId: number
  task: DependencyTask
}

export type DependencyEdgeAddArgs = {
  source: number
  target: number
  task: DependencyTask
}

export type DependencyPlaceOnGraphArgs = {
  task: Task
  side: GraphPlacementSide
}
