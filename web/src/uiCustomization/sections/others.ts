import { markRaw } from 'vue'
import UiCustomizationOthers from '@/components/features/ui-customization/UiCustomizationOthers.vue'
import type { UiCustomizationSectionDef } from '../types'

export const othersSection: UiCustomizationSectionDef = {
  kind: 'custom',
  id: 'others',
  labelKey: 'uiCustomization.sections.others',
  // markRaw: the def ends up inside reactive tab items — a component proxied by
  // reactivity triggers a Vue warning and needless overhead
  component: markRaw(UiCustomizationOthers),
}
