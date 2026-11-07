<template>
  <UModal
    v-model:open="open"
    :title="rule ? t('automations.editTitle') : t('automations.createTitle')"
    :fullscreen="isFullscreenModal"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <AutomationRuleForm
        ref="form"
        v-model="formValue"
        :goal-id="goalId"
        :modules="modules"
        :errors="showErrors ? errors : null"
      />
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        @click="open = false"
      />
      <UButton
        :label="rule ? t('common.save') : t('automations.create')"
        :loading="loading"
        data-testid="automation-submit"
        @click="submit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AutomationRule } from 'taskview-api'
import AutomationRuleForm from './AutomationRuleForm.vue'
import { useTaskView } from '@/composables/useTaskView'
import { useAutomationLabels } from '@/composables/useAutomationLabels'
import { useAutomationRuleValidation } from '@/composables/useAutomationRuleValidation'
import { useAutomationsStore } from '@/stores/automations.store'
import type { AutomationRuleFormValue } from '@/types/automations.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  goalId: number
  rule?: AutomationRule | null
}>()

const { t } = useI18n()
const toast = useToast()
const { isFullscreenModal } = useTaskView()
const store = useAutomationsStore()
const { errorMessage } = useAutomationLabels()

const loading = ref(false)
const showErrors = ref(false)
const form = useTemplateRef<InstanceType<typeof AutomationRuleForm>>('form')
const modules = computed(() => store.catalog?.modules ?? [])

function toFormValue(rule: AutomationRule | null | undefined): AutomationRuleFormValue {
  if (!rule) {
    return { name: '', triggerModule: '', triggerEvent: '', triggerParams: {}, actionModule: '', actionName: '', actionParams: {} }
  }
  return {
    name: rule.name,
    triggerModule: rule.trigger.module,
    triggerEvent: rule.trigger.event,
    triggerParams: { ...rule.trigger.params },
    actionModule: rule.action.module,
    actionName: rule.action.action,
    actionParams: { ...rule.action.params },
  }
}

const formValue = ref<AutomationRuleFormValue>(toFormValue(props.rule))
const { errors, isValid } = useAutomationRuleValidation({ value: formValue, modules })

watch(open, (value) => {
  if (!value) return
  formValue.value = toFormValue(props.rule)
  showErrors.value = false
})

async function revealFirstError() {
  await nextTick()
  const root = form.value?.$el as HTMLElement | undefined
  root?.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function submit() {
  if (!isValid.value) {
    showErrors.value = true
    await revealFirstError()
    return
  }
  loading.value = true
  const result = await store.saveRule({ goalId: props.goalId, ruleId: props.rule?.id ?? null, value: formValue.value })
  loading.value = false

  if (!result.ok) {
    toast.add({ title: errorMessage(result.error), color: 'error' })
    return
  }
  toast.add({ title: t(props.rule ? 'automations.toasts.updated' : 'automations.toasts.created'), color: 'success' })
  open.value = false
}
</script>
