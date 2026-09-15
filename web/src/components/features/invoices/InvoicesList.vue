<template>
  <div class="flex flex-col gap-2 p-2 lg:p-6">
    <InvoicesListItem
      v-for="invoice in invoices"
      :key="invoice.id"
      :invoice="invoice"
      @open="emit('open', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import InvoicesListItem from './InvoicesListItem.vue'
import type { InvoiceItem } from 'taskview-api'

defineProps<{
  invoices: InvoiceItem[]
}>()

const emit = defineEmits<{
  open: [invoice: InvoiceItem]
}>()
</script>
