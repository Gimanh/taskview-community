import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskDetailExtensionFields } from '@/composables/useTaskDetailExtensionFields'
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
    const extensionFields = useTaskDetailExtensionFields()
    // Extension blocks come first for a user who never arranged the panel
    return {
      catalogue: computed(() => [
        ...extensionFields.value.map(f => ({ id: f.id, label: f.label, width: f.width })),
        ...TASK_DETAIL_FIELDS.map(f => ({
          id: f.id,
          label: t(`uiCustomization.taskFields.${f.id}`),
          width: f.width,
        })),
      ]),
    }
  },
}
