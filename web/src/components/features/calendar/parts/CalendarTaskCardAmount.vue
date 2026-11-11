<template>
  <span
    class="flex shrink-0 items-center gap-0.5 text-xs tabular-nums"
    :class="tone"
    data-testid="calendar-task-amount"
  >
    <UIcon
      :name="icon"
      class="size-3.5"
    />
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  amount: number
  // 1 is income, 0 is expense, anything else is a plain amount
  transactionType?: number | null
}>()

const { locale } = useI18n()

const formatted = computed(() => props.amount.toLocaleString(locale.value))

const icon = computed(() => {
  if (props.transactionType === 1) return 'i-lucide-trending-up'
  if (props.transactionType === 0) return 'i-lucide-trending-down'
  return 'i-lucide-coins'
})

const tone = computed(() => {
  if (props.transactionType === 1) return 'text-success'
  if (props.transactionType === 0) return 'text-error'
  return 'text-muted'
})
</script>
