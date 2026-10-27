import { useI18n } from 'vue-i18n'
import type { AutomationApiError } from 'taskview-api'
import { useAutomationsStore } from '@/stores/automations.store'
import type { AutomationOptionLabelArgs } from '@/types/automations.types'

const toKey = (name: string) => name.replace(/\./g, '_')

export function useAutomationLabels() {
  const { t } = useI18n()
  const store = useAutomationsStore()

  const optionsOf = (args: AutomationOptionLabelArgs) => store.optionsByGoal[args.goalId]?.[args.source]

  return {
    moduleLabel: (name: string) => t(`automations.modules.${name}`),
    eventLabel: (name: string) => t(`automations.events.${toKey(name)}`),
    actionLabel: (name: string) => t(`automations.actions.${toKey(name)}`),
    paramLabel: (key: string) => t(`automations.params.${key}`),
    optionLabel: (args: AutomationOptionLabelArgs) => {
      const options = optionsOf(args)
      if (!options) return '…'
      return options.find((option) => option.id === args.id)?.label ?? t('automations.unavailableOption')
    },
    isOptionMissing: (args: AutomationOptionLabelArgs) => {
      const options = optionsOf(args)
      return !!options && !options.some((option) => option.id === args.id)
    },
    errorMessage: (error: AutomationApiError) =>
      error.code === 'cycle'
        ? t('automations.errors.cycle', { path: error.message ?? '' })
        : t(`automations.errors.${error.code}`),
  }
}
