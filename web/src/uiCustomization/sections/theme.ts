import { markRaw } from 'vue'
import UiCustomizationTheme from '@/components/features/ui-customization/UiCustomizationTheme.vue'
import type { UiCustomizationSectionDef } from '../types'

export const themeSection: UiCustomizationSectionDef = {
  kind: 'custom',
  id: 'theme',
  labelKey: 'uiCustomization.sections.theme',
  component: markRaw(UiCustomizationTheme),
}
