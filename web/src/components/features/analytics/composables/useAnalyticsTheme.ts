import type { AnalyticsColorToken } from 'taskview-api'

const palette: Record<AnalyticsColorToken, string> = {
  primary: '#10b981',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#71717a',
  info: '#3b82f6',
}

// Distinct hues for datasets that have no semantic colorToken. Excludes green
// and red so they don't visually collide with the success/danger semantics
// used on other charts.
const fallbackPalette: string[] = [
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#f97316', // orange
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
]

export function useAnalyticsTheme() {
  function colorFor(token: AnalyticsColorToken | undefined, index = 0): string {
    if (token) return palette[token]
    return fallbackPalette[index % fallbackPalette.length]
  }

  function paletteForCount(count: number): string[] {
    return Array.from({ length: count }, (_, i) => fallbackPalette[i % fallbackPalette.length])
  }

  function transparentize(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return { colorFor, paletteForCount, transparentize }
}
