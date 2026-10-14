import type { TaskSortBy } from './tasks.api.types'

export type UiPreferencesItem = {
  id: string
  order: number
  hidden: boolean
  width?: 'narrow' | 'wide'
}

export type FirstDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type DefaultView = 'tasks' | 'kanban' | 'graph' | 'sprints'

export type UiSettings = {
  firstDayOfWeek?: FirstDayOfWeek
  defaultProjectId?: number
  defaultView?: DefaultView
  taskSortBy?: TaskSortBy
  taskSortFirstNew?: 0 | 1
  showTaskId?: 0 | 1
}

export const UI_SETTINGS_KEY = '__settings__'

export type UiPreferences = Record<string, UiPreferencesItem[] | UiSettings>
