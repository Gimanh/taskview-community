import { analyticsIndicatorsSection, analyticsChartsSection } from './sections/analytics'
import { tasksSection } from './sections/tasks'
import { othersSection } from './sections/others'
import type { UiCustomizationSectionDef } from './types'

export const uiCustomizationSections: UiCustomizationSectionDef[] = [
  analyticsIndicatorsSection,
  analyticsChartsSection,
  tasksSection,
  othersSection,
]
