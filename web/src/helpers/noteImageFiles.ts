const handledDrops = new WeakSet<Event>()

export function pickImageFiles(files: ArrayLike<File> | null | undefined): File[] {
  return Array.from(files ?? []).filter((file) => file.type.startsWith('image/'))
}

// The note editor sits inside the task panel drop zone; marking the drop stops the panel from uploading the same files twice.
export function markFileDropHandled(event: Event) {
  handledDrops.add(event)
}

export function isFileDropHandled(event: Event | null | undefined): boolean {
  return !!event && handledDrops.has(event)
}
