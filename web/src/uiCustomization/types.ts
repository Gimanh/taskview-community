import type { ComputedRef } from 'vue'
import type { CatalogueEntry } from '@/composables/useUiPreferences'

export type UiCustomizationSectionUseReturn = {
  catalogue: ComputedRef<CatalogueEntry[]>
  init?: () => Promise<void> | void
}

export type UiCustomizationSectionDef = {
  id: string
  labelKey: string
  useSection: () => UiCustomizationSectionUseReturn
}
