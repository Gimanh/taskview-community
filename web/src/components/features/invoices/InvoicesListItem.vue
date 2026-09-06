<template>
  <button
    type="button"
    class="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-default px-4 py-3 text-left hover:bg-elevated"
    @click="emit('open', invoice)"
  >
    <UIcon
      name="i-lucide-receipt"
      class="size-5 shrink-0 text-muted"
    />
    <div class="flex min-w-0 flex-1 basis-52 flex-col">
      <span class="truncate font-medium text-default">
        {{ invoice.number }} · {{ invoice.counterparty.name }}
      </span>
      <span class="truncate text-xs text-muted">
        {{ invoice.seller.name }} · {{ invoice.goalName }} · {{ issueDate }}
      </span>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <UBadge
        v-if="invoice.replacesInvoiceId !== null"
        :label="t('invoices.replaces')"
        color="neutral"
        variant="subtle"
        size="sm"
      />
      <UBadge
        v-if="overdue"
        :label="t('invoices.overdue')"
        color="error"
        variant="subtle"
        size="sm"
      />
      <UBadge
        :label="t(`invoices.status.${invoice.status}`)"
        :color="statusColors[invoice.status]"
        variant="subtle"
        size="sm"
      />
      <span class="shrink-0 pl-1 text-sm font-semibold tabular-nums text-default">
        {{ formatMoney({ amount: invoice.totals.total, currencyCode: invoice.currencyCode, locale }) }}
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import { formatMoney } from '@/helpers/money'
import { isInvoiceOverdue } from '@/helpers/invoiceDates'
import type { InvoiceItem } from 'taskview-api'

const props = defineProps<{
  invoice: InvoiceItem
}>()

const emit = defineEmits<{
  open: [invoice: InvoiceItem]
}>()

const { t, locale } = useI18n()

const statusColors = { draft: 'warning', issued: 'info', paid: 'success', void: 'neutral' } as const

const issueDate = computed(() => useDateFormat(new Date(props.invoice.issueDate), 'DD MMM YYYY').value)
const overdue = computed(() => isInvoiceOverdue(props.invoice))
</script>
