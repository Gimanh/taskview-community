<template>
  <div
    class="flex flex-col gap-2 rounded-xl border border-default p-3 lg:flex-row lg:items-center"
    :class="{ 'opacity-60': !rule.enabled }"
    data-testid="automation-rule"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate font-medium">{{ rule.name }}</span>
        <UTooltip
          v-if="broken"
          :text="t('automations.brokenHint')"
        >
          <UBadge
            :label="t('automations.broken')"
            icon="i-lucide-triangle-alert"
            color="warning"
            variant="subtle"
            size="sm"
            class="shrink-0"
            data-testid="automation-rule-broken"
          />
        </UTooltip>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 text-sm">
        <UBadge
          :label="t('automations.when')"
          color="neutral"
          variant="subtle"
          size="sm"
        />
        <span class="text-muted">{{ describe(trigger) }}</span>
        <UIcon
          name="i-lucide-arrow-right"
          class="size-4 text-dimmed"
        />
        <UBadge
          :label="t('automations.then')"
          color="primary"
          variant="subtle"
          size="sm"
        />
        <span class="text-muted">{{ describe(action) }}</span>
      </div>
    </div>

    <div class="flex items-center gap-2 self-end lg:self-center">
      <USwitch
        :model-value="rule.enabled"
        :disabled="!canManage || toggling"
        :aria-label="t('automations.enabled')"
        data-testid="automation-rule-toggle"
        @update:model-value="(value) => emit('toggle', value)"
      />
      <UDropdownMenu
        v-if="canManage"
        :items="menuItems"
        :content="{ align: 'end' }"
      >
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          size="xs"
          data-testid="automation-rule-menu"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { AutomationCatalogModule, AutomationRule } from 'taskview-api'
import { useAutomationLabels } from '@/composables/useAutomationLabels'
import type { AutomationStepDescription } from '@/types/automations.types'

const props = defineProps<{
  rule: AutomationRule
  modules: AutomationCatalogModule[]
  canManage: boolean
  toggling?: boolean
}>()

const emit = defineEmits<{
  toggle: [enabled: boolean]
  edit: []
  delete: []
}>()

const { t } = useI18n()
const { moduleLabel, eventLabel, actionLabel, optionLabel, isOptionMissing } = useAutomationLabels()

const moduleOf = (name: string) => props.modules.find((module) => module.name === name)

const trigger = computed<AutomationStepDescription>(() => ({
  module: props.rule.trigger.module,
  label: eventLabel(props.rule.trigger.event),
  definitions: moduleOf(props.rule.trigger.module)?.events.find((item) => item.name === props.rule.trigger.event)?.params ?? [],
  params: props.rule.trigger.params,
}))

const action = computed<AutomationStepDescription>(() => ({
  module: props.rule.action.module,
  label: actionLabel(props.rule.action.action),
  definitions: moduleOf(props.rule.action.module)?.actions.find((item) => item.name === props.rule.action.action)?.params ?? [],
  params: props.rule.action.params,
}))

const broken = computed(() =>
  [trigger.value, action.value].some((step) =>
    step.definitions.some((definition) => {
      const id = step.params[definition.key]
      return id !== undefined && isOptionMissing({ goalId: props.rule.goalId, source: definition.source, id })
    }),
  ),
)

function describe(step: AutomationStepDescription): string {
  const values = step.definitions
    .filter((definition) => step.params[definition.key] !== undefined)
    .map((definition) => `«${optionLabel({ goalId: props.rule.goalId, source: definition.source, id: step.params[definition.key] as number })}»`)
  return [`${moduleLabel(step.module)} · ${step.label}`, ...values].join(' ')
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => emit('edit') }],
  [{ label: t('common.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => emit('delete') }],
])
</script>
