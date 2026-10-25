import type { ThemeNeutralColor, ThemePrimaryColor } from 'taskview-api'
import type { PaletteShade } from './theme-palette.types'

/** Nuxt UI aliases `neutral` to the active neutral color and keeps Tailwind's own neutral as `old-neutral`. */
export function paletteVarName(color: ThemePrimaryColor | ThemeNeutralColor, shade: PaletteShade): string {
  return `--color-${color === 'neutral' ? 'old-neutral' : color}-${shade}`
}

export function paletteVar(color: ThemePrimaryColor | ThemeNeutralColor, shade: PaletteShade): string {
  return `var(${paletteVarName(color, shade)})`
}
