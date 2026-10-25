import { SHORTCUT_OPTIONS, isPlainKeyPress, openDialogCount } from './shortcut-guards'
import { SHORTCUTS, shortcutBinding } from './registry'
import { useShortcutsEnabled } from './useShortcutsEnabled'
import type { TaskShortcutsArgs } from './shortcuts.types'

export function useTaskShortcuts(args: TaskShortcutsArgs) {
  const enabled = useShortcutsEnabled()

  function toggleComplete(event: KeyboardEvent) {
    if (!enabled.value || !isPlainKeyPress(event) || !args.canToggleComplete.value) return
    if (openDialogCount() > 1) return
    args.toggleComplete()
  }

  defineShortcuts({ [shortcutBinding(SHORTCUTS.toggleComplete)]: toggleComplete }, SHORTCUT_OPTIONS)
}
