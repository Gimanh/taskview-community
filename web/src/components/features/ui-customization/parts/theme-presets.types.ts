import type { ThemeColors } from '@/composables/useThemeColors.types'

export type ThemePreset = ThemeColors & {
  id: string
  labelKey: string
}
