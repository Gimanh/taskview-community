<template>
  <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
    <UBadge
      :label="t(`invoices.status.${invoice.status}`)"
      :color="statusColors[invoice.status]"
      variant="subtle"
    />
    <UBadge
      v-if="overdue"
      :label="t('invoices.overdue')"
      color="error"
      variant="subtle"
    />
    <span v-if="invoice.issuedAt">{{ t('invoices.dates.issued') }} {{ date(invoice.issuedAt) }}</span>
    <span v-if="invoice.paidAt">· {{ t('invoices.dates.paid') }} {{ date(invoice.paidAt) }}</span>
    <span v-if="invoice.voidedAt">· {{ t('invoices.dates.voided') }} {{ date(invoice.voidedAt) }}</span>
    <RouterLink
      v-if="invoice.replacesInvoiceId !== null"
      :to="{ name: 'invoice-preview', params: { invoiceId: invoice.replacesInvoiceId } }"
      class="text-primary hover:underline"
    >
      {{ t('invoices.replacesLink') }}
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import type { InvoiceItem } from 'taskview-api'
import { isInvoiceOverdue } from '@/helpers/invoiceDates'

const props = defineProps<{
  invoice: InvoiceItem
}>()

const { t } = useI18n()

const statusColors = { draft: 'warning', issued: 'info', paid: 'success', void: 'neutral' } as const
const overdue = computed(() => isInvoiceOverdue(props.invoice))

function date(value: string): string {
  return useDateFormat(new Date(value), 'DD MMM YYYY').value
}
</script>
