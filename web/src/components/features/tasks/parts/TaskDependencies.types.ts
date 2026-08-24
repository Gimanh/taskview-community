export type DependencyTask = {
  id: number
  description: string
  complete: number | boolean
}

export type DependencyEntry = {
  edgeId: number
  task: DependencyTask
}
