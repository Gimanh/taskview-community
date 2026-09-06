<template>
  <div :class="sectionClass">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-default">{{ t('invoices.tasks.title') }}</span>
      <span class="text-xs text-muted">{{ t('invoices.tasks.hint') }}</span>
    </div>

    <div
      v-if="loading"
      class="flex items-center gap-2 py-3 text-sm text-muted"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-4 animate-spin"
      />
      {{ t('invoices.tasks.loading') }}
    </div>

    <p
      v-else-if="goalId === null"
      class="py-3 text-sm text-muted"
    >
      {{ t('invoices.tasks.selectProject') }}
    </p>

    <p
      v-else-if="tasks.length === 0"
      class="py-3 text-sm text-muted"
    >
      {{ t('invoices.tasks.empty') }}
    </p>

    <div
      v-else
      class="flex flex-col divide-y divide-default rounded-10 bg-elevated/50 max-h-64 overflow-y-auto"
    >
      <label
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-elevated"
      >
        <UCheckbox
          :model-value="selectedIds.has(task.id)"
          @update:model-value="emit('toggle', task)"
        />
        <span class="flex-1 truncate text-sm text-default">{{ task.description }}</span>
        <UBadge
          v-if="task.complete"
          :label="t('invoices.tasks.done')"
          color="success"
          variant="subtle"
          size="sm"
        />
        <span class="text-sm tabular-nums text-muted">{{ formatMoney({ amount: task.amount, currencyCode, locale }) }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ALL_TASKS_LIST_ID, TaskIncomeType } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { formatMoney } from '@/helpers/money'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import type { InvoiceTaskOption } from '@/types/invoices.types'

const props = defineProps<{
  goalId: number | null
  currencyCode: string
  selectedIds: Set<number>
}>()

const emit = defineEmits<{
  toggle: [task: InvoiceTaskOption]
}>()

const { t, locale } = useI18n()
const { sectionClass } = useInvoiceFieldStyle()
const tasks = ref<InvoiceTaskOption[]>([])
const loading = ref(false)

async function loadTasks(goalId: number) {
  loading.value = true
  const result = await $tvApi.tasks
    .fetch({ goalId, componentId: ALL_TASKS_LIST_ID, page: 0, showCompleted: 1, firstNew: 1, unlimited: true })
    .catch(logError)
    .finally(() => { loading.value = false })
  if (!result) return
  tasks.value = result
    .filter((task) => task.transactionType === TaskIncomeType && task.amount !== null && task.amount !== '')
    .map((task) => ({ id: task.id, description: task.description, amount: Number(task.amount), complete: task.complete }))
}

watch(
  () => props.goalId,
  (goalId) => {
    tasks.value = []
    if (goalId !== null) loadTasks(goalId)
  },
  { immediate: true },
)
</script>
