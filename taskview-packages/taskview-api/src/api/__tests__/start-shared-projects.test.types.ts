export type SharedProjectRole = 'editor' | string[]

export type CreateSharedProjectArgs = {
  name: string
  role: SharedProjectRole
}

export type SharedProjectFixture = {
  goalId: number
  listId: number
  tagId: number
  activeTaskId: number
  todayTaskId: number
  upcomingTaskId: number
  completedTaskId: number
  collaboratorId: number
  note: string
}
