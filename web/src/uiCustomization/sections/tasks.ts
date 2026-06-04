import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UiCustomizationListTabDef } from '../types'
import { TASK_DETAIL_FIELDS } from './tasks.types'

// Typed as the list variant (not the union) so consumers like TaskDetailPanel
// can call `tasksSection.useSection()` directly without narrowing.
export const tasksSection: UiCustomizationListTabDef = {
  kind: 'list',
  id: 'tasks',
  labelKey: 'uiCustomization.sections.tasks',
  useSection() {
    const { t } = useI18n()
    return {
      catalogue: computed(() =>
        TASK_DETAIL_FIELDS.map(f => ({
          id: f.id,
          label: t(`uiCustomization.taskFields.${f.id}`),
          width: f.width,
        })),
      ),
    }
  },
}
