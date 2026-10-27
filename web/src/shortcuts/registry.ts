import type { ShortcutDefinition, ShortcutScope } from './shortcuts.types'

export const SHORTCUTS = {
  addTask: { kbds: ['c'], scope: 'global', labelKey: 'shortcuts.addTask' },
  search: { kbds: ['meta', 'k'], scope: 'global', labelKey: 'shortcuts.search' },
  showShortcuts: { kbds: ['?'], scope: 'global', labelKey: 'shortcuts.showShortcuts' },
  close: { kbds: ['escape'], scope: 'global', labelKey: 'shortcuts.close' },
  toggleComplete: { kbds: ['x'], scope: 'task', labelKey: 'shortcuts.toggleComplete' },
} as const satisfies Record<string, ShortcutDefinition>

export const SHORTCUT_SCOPES: ShortcutScope[] = ['global', 'task']

export function shortcutsOfScope(scope: ShortcutScope): ShortcutDefinition[] {
  return Object.values(SHORTCUTS).filter(shortcut => shortcut.scope === scope)
}

export function shortcutBinding(shortcut: ShortcutDefinition): string {
  return shortcut.kbds.join('_')
}
