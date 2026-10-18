<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ rule ? t('automations.editTitle') : t('automations.createTitle') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <AutomationRuleForm
          v-model="formValue"
          :goal-id="goalId"
          :modules="modules"
          :submit-label="rule ? t('common.save') : t('automations.create')"
          :loading="loading"
          @submit="submit"
          @cancel="open = false"
        />
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AutomationRule } from 'taskview-api'
import AutomationRuleForm from './AutomationRuleForm.vue'
import { useTaskView } from '@/composables/useTaskView'
import { useAutomationLabels } from '@/composables/useAutomationLabels'
import { useAutomationsStore } from '@/stores/automations.store'
import type { AutomationRuleFormValue } from '@/types/automations.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  goalId: number
  rule?: AutomationRule | null
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const store = useAutomationsStore()
const { errorMessage } = useAutomationLabels()

const loading = ref(false)
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

watch(open, (value) => {
  if (value) formValue.value = toFormValue(props.rule)
})

async function submit() {
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
