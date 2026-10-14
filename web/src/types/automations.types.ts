import type {
  AutomationApiError,
  AutomationCatalog,
  AutomationDataSourceName,
  AutomationOption,
  AutomationParamDefinition,
  AutomationParams,
  AutomationRule,
} from 'taskview-api'

export type AutomationsStoreState = {
  catalog: AutomationCatalog | null
  rulesByGoal: Record<number, AutomationRule[]>
  optionsByGoal: Record<number, Partial<Record<AutomationDataSourceName, AutomationOption[]>>>
  loadingGoals: Record<number, boolean>
}

export type AutomationRuleFormValue = {
  name: string
  triggerModule: string
  triggerEvent: string
  triggerParams: AutomationParams
  actionModule: string
  actionName: string
  actionParams: AutomationParams
}

export type AutomationSaveResult =
  | { ok: true, rule: AutomationRule }
  | { ok: false, error: AutomationApiError }

export type AutomationFetchOptionsArgs = {
  goalId: number
  source: AutomationDataSourceName
}

export type AutomationSaveRuleArgs = {
  goalId: number
  ruleId: number | null
  value: AutomationRuleFormValue
}

export type AutomationToggleRuleArgs = {
  rule: AutomationRule
  enabled: boolean
}

export type AutomationOptionLabelArgs = {
  goalId: number
  source: AutomationDataSourceName
  id: number
}

export type AutomationSetParamArgs = {
  key: string
  value: number | undefined
}

export type AutomationHasParamsArgs = {
  definitions: AutomationParamDefinition[] | undefined
  params: AutomationParams
}

export type AutomationStepDescription = {
  module: string
  label: string
  definitions: AutomationParamDefinition[]
  params: AutomationParams
}

export type AutomationSelectItem = {
  label: string
  value: string
  disabled?: boolean
  description?: string
}
