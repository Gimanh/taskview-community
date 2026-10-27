import type { RouteLocationRaw } from 'vue-router'

export type SettingsTint =
  | 'emerald'
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'cyan'
  | 'amber'
  | 'sky'
  | 'rose'
  | 'teal'
  | 'zinc'

type SettingsRowBase = {
  key: string
  icon: string
  color: SettingsTint
  title: string
}

export type SettingsNavRowItem = SettingsRowBase & {
  kind: 'nav'
  to?: RouteLocationRaw
  href?: string
}

export type SettingsSelectOption = {
  label: string
  value: string
}

export type SettingsSelectRowItem = SettingsRowBase & {
  kind: 'select'
  options: SettingsSelectOption[]
  get: () => string
  set: (value: string) => void
}

export type SettingsActionRowItem = SettingsRowBase & {
  kind: 'action'
  kbds?: string[]
  onSelect: () => void
}

export type SettingsRowItem = SettingsNavRowItem | SettingsSelectRowItem | SettingsActionRowItem

export type SettingsSection = {
  key: string
  title: string
  items: SettingsRowItem[]
}
