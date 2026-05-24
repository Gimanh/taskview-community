import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UiCustomizationSectionDef } from '../types'
import { TASK_DETAIL_FIELDS } from './tasks.types'

export const tasksSection: UiCustomizationSectionDef = {
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
