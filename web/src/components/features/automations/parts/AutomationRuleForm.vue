<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('automations.fields.name')">
      <UInput
        v-model="model.name"
        :placeholder="t('automations.fields.namePlaceholder')"
        autofocus
        class="w-full"
        data-testid="automation-name"
      />
    </UFormField>

    <AutomationRuleStepFields
      v-model:module="model.triggerModule"
      v-model:item="model.triggerEvent"
      v-model:params="model.triggerParams"
      :goal-id="goalId"
      kind="event"
      :title="t('automations.when')"
      :modules="modules"
    />

    <div class="flex justify-center text-dimmed">
      <UIcon
        name="i-lucide-arrow-down"
        class="size-5"
      />
    </div>

    <AutomationRuleStepFields
      v-model:module="model.actionModule"
      v-model:item="model.actionName"
      v-model:params="model.actionParams"
      :goal-id="goalId"
      kind="action"
      :title="t('automations.then')"
      :modules="modules"
    />

    <p class="text-xs text-dimmed">
      {{ t('automations.runsAsHint') }}
    </p>

    <div class="flex justify-end gap-2">
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      />
      <UButton
        :label="submitLabel"
        :loading="loading"
        :disabled="!isComplete"
        data-testid="automation-submit"
        @click="emit('submit')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AutomationCatalogModule } from 'taskview-api'
import AutomationRuleStepFields from './AutomationRuleStepFields.vue'
import type { AutomationHasParamsArgs, AutomationRuleFormValue } from '@/types/automations.types'

const props = defineProps<{
  goalId: number
  modules: AutomationCatalogModule[]
  submitLabel: string
  loading?: boolean
}>()

const model = defineModel<AutomationRuleFormValue>({ required: true })

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const { t } = useI18n()

const hasAll = (args: AutomationHasParamsArgs) =>
  !!args.definitions && args.definitions.every((definition) => args.params[definition.key] !== undefined)

const isComplete = computed(() => {
  const value = model.value
  const module = (name: string) => props.modules.find((item) => item.name === name)
  const event = module(value.triggerModule)?.events.find((item) => item.name === value.triggerEvent)
  const action = module(value.actionModule)?.actions.find((item) => item.name === value.actionName)
  return value.name.trim().length > 0
    && hasAll({ definitions: event?.params, params: value.triggerParams })
    && hasAll({ definitions: action?.params, params: value.actionParams })
})
</script>
