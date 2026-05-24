export type UiPreferencesItem = {
  id: string
  order: number
  hidden: boolean
  width?: 'narrow' | 'wide'
}

export type UiPreferences = Record<string, UiPreferencesItem[]>
