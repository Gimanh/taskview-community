import UiCustomizationOthers from '@/components/features/ui-customization/UiCustomizationOthers.vue'
import type { UiCustomizationSectionDef } from '../types'

export const othersSection: UiCustomizationSectionDef = {
  kind: 'custom',
  id: 'others',
  labelKey: 'uiCustomization.sections.others',
  component: UiCustomizationOthers,
}
