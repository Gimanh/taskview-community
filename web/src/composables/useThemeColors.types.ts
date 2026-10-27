import type { CustomTheme, ThemeNeutralColor, ThemePrimaryColor } from 'taskview-api'

export type ThemeColors = {
  primary: ThemePrimaryColor
  neutral: ThemeNeutralColor
}

export type ThemeSnapshot = ThemeColors & {
  customTheme: CustomTheme | null
}
