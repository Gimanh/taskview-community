import type { CustomTheme } from 'taskview-api'
import type { ThemeColors } from '@/composables/useThemeColors.types'
import { paletteVar } from './theme-palette'

function soft(color: string, share: number): string {
  return `color-mix(in oklab, ${color} ${share}%, transparent)`
}

export function palettePreviewVars(colors: ThemeColors): Record<string, string> {
  const { primary, neutral } = colors
  return {
    '--pv-accent': paletteVar(primary, 500),
    '--pv-accent-dark': paletteVar(primary, 400),
    '--pv-accent-soft': soft(paletteVar(primary, 500), 14),
    '--pv-accent-soft-dark': soft(paletteVar(primary, 400), 18),
    '--pv-surface': paletteVar(neutral, 50),
    '--pv-surface-dark': paletteVar(neutral, 950),
    '--pv-sidebar': paletteVar(neutral, 100),
    '--pv-sidebar-dark': paletteVar(neutral, 900),
    '--pv-border': paletteVar(neutral, 200),
    '--pv-border-dark': paletteVar(neutral, 800),
    '--pv-line': paletteVar(neutral, 300),
    '--pv-line-dark': paletteVar(neutral, 700),
    '--pv-faint': paletteVar(neutral, 200),
    '--pv-faint-dark': paletteVar(neutral, 800),
  }
}

export function customPreviewVars(theme: CustomTheme): Record<string, string> {
  const { light, dark } = theme
  return {
    '--pv-accent': light.accent,
    '--pv-accent-dark': dark.accent,
    '--pv-accent-soft': soft(light.accent, 14),
    '--pv-accent-soft-dark': soft(dark.accent, 18),
    '--pv-surface': light.background,
    '--pv-surface-dark': dark.background,
    '--pv-sidebar': light.surface,
    '--pv-sidebar-dark': dark.surface,
    '--pv-border': light.border,
    '--pv-border-dark': dark.border,
    '--pv-line': `color-mix(in oklab, ${light.text} 35%, ${light.background})`,
    '--pv-line-dark': `color-mix(in oklab, ${dark.text} 35%, ${dark.background})`,
    '--pv-faint': light.border,
    '--pv-faint-dark': dark.border,
  }
}
