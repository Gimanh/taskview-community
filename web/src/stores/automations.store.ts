import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import type { AutomationApiError, AutomationOption, AutomationRule } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import type {
  AutomationFetchOptionsArgs,
  AutomationSaveResult,
  AutomationSaveRuleArgs,
  AutomationsStoreState,
  AutomationToggleRuleArgs,
} from '@/types/automations.types'

function toApiError(err: unknown): AutomationApiError {
  if (isAxiosError(err) && err.response?.data?.code) return err.response.data as AutomationApiError
  return { code: 'invalid', message: null }
}

export const useAutomationsStore = defineStore('automations', {
  state: (): AutomationsStoreState => ({
    catalog: null,
    rulesByGoal: {},
    optionsByGoal: {},
    loadingGoals: {},
  }),
  getters: {
    rulesFor: (state) => (goalId: number): AutomationRule[] => state.rulesByGoal[goalId] ?? [],
  },
  actions: {
    async fetchCatalog(): Promise<void> {
      if (this.catalog) return
      const catalog = await $tvApi.automations.getCatalog().catch(logError)
      if (catalog) this.catalog = catalog
    },

    async fetchRules(goalId: number): Promise<void> {
      this.loadingGoals[goalId] = true
      const rules = await $tvApi.automations
        .listRules(goalId)
        .catch(logError)
        .finally(() => {
          this.loadingGoals[goalId] = false
        })
      if (rules) this.rulesByGoal[goalId] = rules
    },

    async fetchOptions(args: AutomationFetchOptionsArgs): Promise<AutomationOption[]> {
      const options = await $tvApi.automations.getOptions(args).catch(logError)
      if (!options) return this.optionsByGoal[args.goalId]?.[args.source] ?? []
      this.optionsByGoal[args.goalId] = { ...this.optionsByGoal[args.goalId], [args.source]: options }
      return options
    },

    async saveRule(args: AutomationSaveRuleArgs): Promise<AutomationSaveResult> {
      const { value } = args
      const body = {
        name: value.name.trim(),
        trigger: { module: value.triggerModule, event: value.triggerEvent, params: value.triggerParams },
        action: { module: value.actionModule, action: value.actionName, params: value.actionParams },
      }
      try {
        const rule = args.ruleId === null
          ? await $tvApi.automations.createRule({ goalId: args.goalId, ...body })
          : await $tvApi.automations.updateRule({ ruleId: args.ruleId, ...body })
        this.upsertRule(rule)
        return { ok: true, rule }
      } catch (err) {
        return { ok: false, error: toApiError(err) }
      }
    },

    async toggleRule(args: AutomationToggleRuleArgs): Promise<AutomationSaveResult> {
      try {
        const rule = await $tvApi.automations.updateRule({ ruleId: args.rule.id, enabled: args.enabled })
        this.upsertRule(rule)
        return { ok: true, rule }
      } catch (err) {
        return { ok: false, error: toApiError(err) }
      }
    },

    async deleteRule(rule: AutomationRule): Promise<boolean> {
      const deleted = await $tvApi.automations.deleteRule(rule.id).catch(logError)
      if (!deleted) return false
      this.rulesByGoal[rule.goalId] = this.rulesFor(rule.goalId).filter((item) => item.id !== rule.id)
      return true
    },

    upsertRule(rule: AutomationRule) {
      const rules = this.rulesFor(rule.goalId)
      const index = rules.findIndex((item) => item.id === rule.id)
      this.rulesByGoal[rule.goalId] = index === -1
        ? [...rules, rule]
        : rules.map((item) => (item.id === rule.id ? rule : item))
    },
  },
})
