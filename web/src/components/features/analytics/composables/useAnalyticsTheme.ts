import type { AnalyticsColorToken } from 'taskview-api'

const palette: Record<AnalyticsColorToken, string> = {
  primary: '#10b981',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#71717a',
  info: '#3b82f6',
}

const fallbackOrder: AnalyticsColorToken[] = [
  'primary',
  'info',
  'warning',
  'success',
  'danger',
  'neutral',
]

export function useAnalyticsTheme() {
  function colorFor(token: AnalyticsColorToken | undefined, index = 0): string {
    if (token) return palette[token]
    return palette[fallbackOrder[index % fallbackOrder.length]]
  }

  function paletteForCount(count: number): string[] {
    return Array.from({ length: count }, (_, i) => palette[fallbackOrder[i % fallbackOrder.length]])
  }

  function transparentize(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return { colorFor, paletteForCount, transparentize }
}
