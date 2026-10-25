import type { Ref } from 'vue'

export type TaskShortcutsArgs = {
  canToggleComplete: Ref<boolean>
  toggleComplete: () => void
}

export type ShortcutScope = 'global' | 'task'

export type ShortcutDefinition = {
  kbds: string[]
  scope: ShortcutScope
  labelKey: string
}
