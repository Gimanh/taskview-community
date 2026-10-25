export type RawGetArgs = {
  token: string
  path: string
  params?: Record<string, string>
}

export type RawGetResult<T> = {
  status: number
  body: T | undefined
}

export type StartListRow = {
  goalId: number
  goalName: string
  listId: number
  listName: string
}

export type StartSearchRow = {
  id: number
  goalId: number
  description: string
  note: string | null
}
