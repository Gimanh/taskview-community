<template>
  <div class="w-full h-fit shadow-sm rounded-lg p-2 dark:bg-tv-ui-bg-elevated">
    <!-- <label class="text-sm text-muted mb-2 block">{{ t('tasks.amount') }}</label> -->

    <div class="flex gap-2">
      <div class="flex flex-col lg:flex-row gap-2 flex-1">
        <!-- Amount Input -->
        <UInput
          :disabled="!canDeleteTask"
          :model-value="localAmount"
          type="text"
          inputmode="decimal"
          size="xl"
          :placeholder="t('tasks.enterAmount')"
          class="flex-1"
          :variant="isDark ? 'subtle' : 'soft'"
          @update:model-value="handleAmountInput"
        >
          <template #leading>
            <UIcon
              name="i-lucide-coins"
              class="size-4 text-muted"
            />
          </template>
        </UInput>

        <!-- Transaction Type Tabs -->
        <UTabs
          :key="tabResetKey"
          :model-value="selectedTabValue"
          :items="tabItems"
          :content="false"
          variant="pill"
          size="md"
          color="success"
          :class="{'pointer-events-none': !canDeleteTask}"
          class="shrink-0 shadow-sm rounded-lg border border-accented flex-1"
          @update:model-value="handleTabChange"
        />
      </div>
      

      <!-- Clear Button -->
      <UButton
        v-if="hasValue"
        :disabled="!canDeleteTask"
        icon="i-lucide-x"
        color="info"
        variant="soft"
        size="sm"
        @click="clearAmount"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { useTasksStore } from '@/stores/tasks.store'
import { useColor } from '@/composables/useColotMode'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const props = defineProps<{
  taskId: number
  amount: number | string | null
  transactionType: 1 | 0 | null
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const { isDark } = useColor()
const { canDeleteTask } = useGoalPermissions()

const localAmount = ref<string>(props.amount?.toString() ?? '')
const tabResetKey = ref(0)

// Watch for external changes, skip if numeric value is the same
watch(() => props.amount, (newAmount) => {
  const incoming = newAmount === null ? null : parseFloat(newAmount.toString())
  const current = localAmount.value === '' ? null : parseFloat(localAmount.value)

  if (incoming !== current) {
    localAmount.value = newAmount?.toString() ?? ''
  }
})

const tabItems = computed(() => [
  {
    label: t('tasks.income'),
    icon: 'i-lucide-trending-up',
    value: 'income',
  },
  {
    label: t('tasks.expense'),
    icon: 'i-lucide-trending-down',
    value: 'expense',
  },
])

const selectedTabValue = computed(() => {
  if (props.transactionType === 1) return 'income'
  if (props.transactionType === 0) return 'expense'
  return undefined
})

async function handleTabChange(value: string | number) {
  const newType = value === 'income' ? 1 : 0
  if (newType === props.transactionType) return

  await tasksStore.updateTaskTransactionType({
    id: props.taskId,
    transactionType: newType as 1 | 0,
  })
}

const hasValue = computed(() =>
  localAmount.value !== '' || props.transactionType !== null,
)

const debouncedUpdateAmount = useDebounceFn(async (amount: string | null) => {
  await tasksStore.updateTaskAmount({
    id: props.taskId,
    amount,
  })
}, 200)

function handleAmountInput(value: string | number) {
  const raw = value.toString().replace(',', '.')
  const sanitized = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  localAmount.value = sanitized

  const amount = sanitized === '' ? null : sanitized
  debouncedUpdateAmount(amount)
}

async function clearAmount() {
  localAmount.value = ''
  await tasksStore.updateTaskAmount({
    id: props.taskId,
    amount: null,
  })
  await tasksStore.updateTaskTransactionType({
    id: props.taskId,
    transactionType: null,
  })
  tabResetKey.value++
}
</script>

