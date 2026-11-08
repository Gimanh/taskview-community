import type { CustomTheme, ProjectTheme, ThemeNeutralColor, ThemePrimaryColor } from 'taskview-api'

export type ThemeColors = {
  primary: ThemePrimaryColor
  neutral: ThemeNeutralColor
}

export type ThemeSnapshot = ThemeColors & {
  customTheme: CustomTheme | null
}

export type ThemeCache = {
  global: ThemeSnapshot
  projects: Record<string, ThemeSnapshot>
}

export type SetProjectThemeArgs = {
  projectId: number
  theme: ProjectTheme | null
}
