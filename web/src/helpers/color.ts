import type { GoalItem } from 'taskview-api'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export const COLOR_PRESETS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00',
  '#F4511E', '#6D4C41', '#546E7A', '#26A69A', '#EC407A',
]

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && HEX_COLOR_PATTERN.test(value)
}

export function contrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function projectColor(project: Pick<GoalItem, 'color'> | null | undefined): string | null {
  return isHexColor(project?.color) ? project.color : null
}
