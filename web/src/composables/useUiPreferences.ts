import { computed } from 'vue'
import type { UiPreferencesItem } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

export type ItemWidth = 'narrow' | 'wide'

export type CatalogueEntry<T extends string = string> = {
  id: T
  // Visible to user — must be passed in by the caller (it usually depends on i18n).
  label: string
  // Default width for the item. If set, the customization UI will render a
  // width toggle for this item. If undefined, width customization is disabled
  // for that item.
  width?: ItemWidth
}

export type ResolvedItem<T extends string = string> = {
  id: T
  label: string
  hidden: boolean
  order: number
  width?: ItemWidth
}

// Merges a catalogue of allowed items with stored user prefs.
// Order: items present in prefs keep their saved order; items new to the catalogue
// (never seen by this user) are appended in their catalogue order with hidden=false.
// Width: user-saved width wins; otherwise catalogue default is used.
export function useUiPreferences(section: string, catalogue: () => CatalogueEntry[]) {
  const store = useUiPreferencesStore()

  const resolved = computed<ResolvedItem[]>(() => {
    const entries = catalogue()
    const entryById = new Map(entries.map(e => [e.id, e]))
    const allowedIds = new Set(entries.map(e => e.id))
    const saved: UiPreferencesItem[] = store.getSection(section)

    const used = new Set<string>()
    const fromSaved: ResolvedItem[] = []
    for (const item of [...saved].sort((a, b) => a.order - b.order)) {
      const entry = entryById.get(item.id)
      if (!entry) continue
      if (!allowedIds.has(item.id)) continue
      used.add(item.id)
      fromSaved.push({
        id: item.id,
        label: entry.label,
        hidden: item.hidden,
        order: fromSaved.length,
        width: entry.width !== undefined ? (item.width ?? entry.width) : undefined,
      })
    }

    for (const entry of entries) {
      if (used.has(entry.id)) continue
      fromSaved.push({
        id: entry.id,
        label: entry.label,
        hidden: false,
        order: fromSaved.length,
        width: entry.width,
      })
    }

    return fromSaved
  })

  const visibleIds = computed(() =>
    resolved.value.filter(r => !r.hidden).map(r => r.id),
  )

  function isVisible(id: string): boolean {
    return visibleIds.value.includes(id)
  }

  function orderOf(id: string): number {
    const idx = resolved.value.findIndex(r => r.id === id)
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
  }

  return { resolved, visibleIds, isVisible, orderOf }
}
