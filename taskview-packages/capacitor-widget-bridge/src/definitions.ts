export type WidgetSnapshotTask = {
  id: number
  title: string
  priority: 1 | 2 | 3
  overdue: boolean
  endTime: string | null
  endDate: string | null
  path: string
}

export type WidgetSnapshotMode = 'today' | 'upcoming'

export type WidgetSnapshot = {
  v: 3
  generatedAt: string
  locale: string
  orgSlug: string | null
  mode: WidgetSnapshotMode
  todayCount: number
  overdueCount: number
  upcomingCount: number
  tasks: WidgetSnapshotTask[]
}

export type SetSnapshotOptions = {
  snapshot: string
}

export type WidgetBridgePlugin = {
  setSnapshot(options: SetSnapshotOptions): Promise<void>
  clearSnapshot(): Promise<void>
}
