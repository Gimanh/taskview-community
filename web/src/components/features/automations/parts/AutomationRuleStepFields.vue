<template>
  <div
    class="flex flex-col gap-3 rounded-xl bg-elevated/50 p-3"
    :data-testid="`automation-${kind}-step`"
  >
    <span class="text-xs font-semibold uppercase tracking-wide text-muted">{{ title }}</span>

    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('automations.fields.module')"
        class="flex-1"
      >
        <USelect
          v-model="moduleName"
          :items="moduleItems"
          :placeholder="t('automations.placeholders.module')"
          class="w-full"
          :data-testid="`automation-${kind}-module`"
        />
      </UFormField>

      <UFormField
        :label="t(kind === 'event' ? 'automations.fields.event' : 'automations.fields.action')"
        class="flex-1"
      >
        <USelect
          v-model="itemName"
          :items="stepItems"
          :disabled="!moduleName"
          :placeholder="t(kind === 'event' ? 'automations.placeholders.event' : 'automations.placeholders.action')"
          class="w-full"
          :data-testid="`automation-${kind}-name`"
        />
      </UFormField>
    </div>

    <AutomationParamSelect
      v-for="definition in selectedItem?.params ?? []"
      :key="`${itemName}-${definition.key}`"
      :model-value="params[definition.key]"
      :goal-id="goalId"
      :definition="definition"
      @update:model-value="(value) => setParam({ key: definition.key, value })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AutomationCatalogAction, AutomationCatalogEvent, AutomationCatalogModule, AutomationParams, GoalPermissions } from 'taskview-api'
import AutomationParamSelect from './AutomationParamSelect.vue'
import { useAutomationLabels } from '@/composables/useAutomationLabels'
import { useGoalsStore } from '@/stores/goals.store'
import type { AutomationSelectItem, AutomationSetParamArgs } from '@/types/automations.types'

const props = defineProps<{
  goalId: number
  kind: 'event' | 'action'
  title: string
  modules: AutomationCatalogModule[]
}>()

const moduleName = defineModel<string>('module', { required: true })
const itemName = defineModel<string>('item', { required: true })
const params = defineModel<AutomationParams>('params', { required: true })

const { t } = useI18n()
const { moduleLabel, eventLabel, actionLabel } = useAutomationLabels()
const goalsStore = useGoalsStore()

const itemsOf = (module: AutomationCatalogModule) => (props.kind === 'event' ? module.events : module.actions)

const moduleItems = computed<AutomationSelectItem[]>(() =>
  props.modules
    .filter((module) => itemsOf(module).length > 0)
    .map((module) => ({ label: moduleLabel(module.name), value: module.name })),
)

const selectedModule = computed(() => props.modules.find((module) => module.name === moduleName.value) ?? null)

function isAvailable(item: AutomationCatalogEvent | AutomationCatalogAction): boolean {
  if (!('requiredPermissions' in item)) return true
  const permissions = goalsStore.goalMap.get(props.goalId)?.permissions
  return item.requiredPermissions.every((permission) => !!permissions?.[permission as keyof GoalPermissions])
}

const stepItems = computed<AutomationSelectItem[]>(() =>
  (selectedModule.value ? itemsOf(selectedModule.value) : []).map((item) => {
    const available = isAvailable(item)
    return {
      label: props.kind === 'event' ? eventLabel(item.name) : actionLabel(item.name),
      value: item.name,
      disabled: !available,
      description: available ? undefined : t('automations.actionUnavailable'),
    }
  }),
)

const selectedItem = computed(() =>
  selectedModule.value ? itemsOf(selectedModule.value).find((item) => item.name === itemName.value) ?? null : null,
)

function setParam(args: AutomationSetParamArgs) {
  const next = { ...params.value }
  if (args.value === undefined) delete next[args.key]
  else next[args.key] = args.value
  params.value = next
}

watch(moduleName, (value, previous) => {
  if (previous !== undefined && value !== previous) itemName.value = ''
})

watch(selectedItem, (item) => {
  const keys = new Set(item?.params.map((definition) => definition.key) ?? [])
  const next: AutomationParams = {}
  for (const [key, value] of Object.entries(params.value)) {
    if (keys.has(key)) next[key] = value
  }
  params.value = next
})
</script>
