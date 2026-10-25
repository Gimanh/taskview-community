export const SHORTCUT_OPTIONS = { layoutIndependent: true }

export function openDialogCount(): number {
  return document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]').length
}

export function isPlainKeyPress(event: KeyboardEvent): boolean {
  return !event.altKey && !event.repeat
}
