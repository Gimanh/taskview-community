<template>
  <div class="flex flex-col gap-4">
    <UFormField
      :label="t('automations.fields.name')"
      :error="errors?.name ? t('automations.validation.required') : false"
      required
    >
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
      :errors="errors?.trigger"
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
      :errors="errors?.action"
    />

    <p class="text-xs text-dimmed">
      {{ t('automations.runsAsHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AutomationCatalogModule } from 'taskview-api'
import AutomationRuleStepFields from './AutomationRuleStepFields.vue'
import type { AutomationRuleFormErrors, AutomationRuleFormValue } from '@/types/automations.types'

defineProps<{
  goalId: number
  modules: AutomationCatalogModule[]
  errors?: AutomationRuleFormErrors | null
}>()

const model = defineModel<AutomationRuleFormValue>({ required: true })

const { t } = useI18n()
</script>
