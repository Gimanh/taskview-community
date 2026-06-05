import type { Component, ComputedRef } from 'vue'
import type { CatalogueEntry } from '@/composables/useUiPreferences'

export type UiCustomizationSectionUseReturn = {
  catalogue: ComputedRef<CatalogueEntry[]>
  init?: () => Promise<void> | void
}

type UiCustomizationTabBase = {
  id: string
  labelKey: string
}

/**
 * A reorder/hide list tab driven by a catalogue of items (analytics sections,
 * task fields, …) — rendered via UiCustomizationSection.
 */
export type UiCustomizationListTabDef = UiCustomizationTabBase & {
  kind: 'list'
  useSection: () => UiCustomizationSectionUseReturn
}

/**
 * A tab that renders an arbitrary settings component (e.g. scalar preferences
 * like "first day of week"). Not a reorderable list.
 */
export type UiCustomizationCustomTabDef = UiCustomizationTabBase & {
  kind: 'custom'
  component: Component
}

export type UiCustomizationSectionDef = UiCustomizationListTabDef | UiCustomizationCustomTabDef
