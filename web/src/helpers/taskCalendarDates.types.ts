export type TaskDropArgs = {
  taskId: number
  date: Date
  allDay: boolean
  // How long a task dropped on a time slot lasts
  minutes: number
}
