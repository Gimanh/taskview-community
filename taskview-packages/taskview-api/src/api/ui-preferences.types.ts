import type { TaskSortBy } from './tasks.api.types'

export type UiPreferencesItem = {
  id: string
  order: number
  hidden: boolean
  width?: 'narrow' | 'wide'
}

export type FirstDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type DefaultView = 'tasks' | 'kanban' | 'graph' | 'sprints'

export const THEME_PRIMARY_COLORS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
] as const

export const THEME_NEUTRAL_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'moss', 'tide', 'ink', 'plum', 'wine', 'sand',
] as const

export type ThemePrimaryColor = typeof THEME_PRIMARY_COLORS[number]

export type ThemeNeutralColor = typeof THEME_NEUTRAL_COLORS[number]

export const DEFAULT_THEME_PRIMARY_COLOR: ThemePrimaryColor = 'green'

export const DEFAULT_THEME_NEUTRAL_COLOR: ThemeNeutralColor = 'zinc'

export const CUSTOM_THEME_COLOR_KEYS = ['background', 'surface', 'border', 'text', 'accent'] as const

export type CustomThemeColorKey = typeof CUSTOM_THEME_COLOR_KEYS[number]

/** Hex colors (#rrggbb) for one color mode. */
export type CustomThemePalette = Record<CustomThemeColorKey, string>

export type CustomTheme = {
  light: CustomThemePalette
  dark: CustomThemePalette
}

export type UiSettings = {
  firstDayOfWeek?: FirstDayOfWeek
  defaultProjectId?: number
  defaultView?: DefaultView
  taskSortBy?: TaskSortBy
  taskSortFirstNew?: 0 | 1
  showTaskId?: 0 | 1
  keyboardShortcuts?: 0 | 1
  primaryColor?: ThemePrimaryColor
  neutralColor?: ThemeNeutralColor
  customTheme?: CustomTheme
  customThemeActive?: 0 | 1
}

export const UI_SETTINGS_KEY = '__settings__'

export type UiPreferences = Record<string, UiPreferencesItem[] | UiSettings>
