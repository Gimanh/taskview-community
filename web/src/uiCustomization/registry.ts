import { analyticsIndicatorsSection, analyticsChartsSection } from './sections/analytics'
import { tasksSection } from './sections/tasks'
import { othersSection } from './sections/others'
import { themeSection } from './sections/theme'
import type { UiCustomizationSectionDef } from './types'

export const uiCustomizationSections: UiCustomizationSectionDef[] = [
  analyticsIndicatorsSection,
  analyticsChartsSection,
  tasksSection,
  themeSection,
  othersSection,
]
