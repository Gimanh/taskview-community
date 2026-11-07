import { computed } from 'vue'
import type {
  AutomationRuleFormErrors,
  AutomationRuleValidationArgs,
  AutomationStepErrors,
  AutomationStepValidationArgs,
} from '@/types/automations.types'

const validateStep = (args: AutomationStepValidationArgs): AutomationStepErrors => ({
  module: !args.moduleName,
  item: !args.itemName,
  params: (args.definitions ?? [])
    .filter((definition) => args.params[definition.key] === undefined)
    .map((definition) => definition.key),
})

const stepIsValid = (step: AutomationStepErrors) => !step.module && !step.item && step.params.length === 0

export const useAutomationRuleValidation = (args: AutomationRuleValidationArgs) => {
  const errors = computed<AutomationRuleFormErrors>(() => {
    const value = args.value.value
    const module = (name: string) => args.modules.value.find((item) => item.name === name)
    const event = module(value.triggerModule)?.events.find((item) => item.name === value.triggerEvent)
    const action = module(value.actionModule)?.actions.find((item) => item.name === value.actionName)
    return {
      name: value.name.trim().length === 0,
      trigger: validateStep({
        moduleName: value.triggerModule,
        itemName: event ? value.triggerEvent : '',
        definitions: event?.params,
        params: value.triggerParams,
      }),
      action: validateStep({
        moduleName: value.actionModule,
        itemName: action ? value.actionName : '',
        definitions: action?.params,
        params: value.actionParams,
      }),
    }
  })

  const isValid = computed(() => !errors.value.name && stepIsValid(errors.value.trigger) && stepIsValid(errors.value.action))

  return { errors, isValid }
}
