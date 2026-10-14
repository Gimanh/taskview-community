<template>
  <UFormField :label="paramLabel(definition.key)">
    <USelect
      v-model="model"
      :items="items"
      :loading="loading"
      :placeholder="t('automations.placeholders.option')"
      class="w-full"
      :data-testid="`automation-param-${definition.key}`"
    />
  </UFormField>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AutomationParamDefinition } from 'taskview-api'
import { useAutomationsStore } from '@/stores/automations.store'
import { useAutomationLabels } from '@/composables/useAutomationLabels'

const props = defineProps<{
  goalId: number
  definition: AutomationParamDefinition
}>()

const model = defineModel<number | undefined>()

const { t } = useI18n()
const store = useAutomationsStore()
const { paramLabel } = useAutomationLabels()

const loading = ref(false)

const items = computed(() =>
  (store.optionsByGoal[props.goalId]?.[props.definition.source] ?? []).map((option) => ({
    label: option.label,
    value: option.id,
  })),
)

onMounted(async () => {
  loading.value = true
  await store.fetchOptions({ goalId: props.goalId, source: props.definition.source })
  loading.value = false
})
</script>
