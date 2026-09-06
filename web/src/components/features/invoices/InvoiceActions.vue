<template>
  <UButton
    v-if="invoice.status === 'draft'"
    icon="i-lucide-pencil"
    :label="compact ? undefined : t('common.edit')"
    color="neutral"
    variant="outline"
    @click="emit('edit')"
  />
  <UButton
    v-if="invoice.status === 'draft'"
    icon="i-lucide-send"
    :label="compact ? undefined : t('invoices.actions.issue')"
    variant="soft"
    :loading="busy"
    @click="emit('transition', 'issued')"
  />
  <UButton
    v-if="invoice.status === 'issued'"
    icon="i-lucide-badge-check"
    :label="compact ? undefined : t('invoices.actions.markPaid')"
    variant="soft"
    :loading="busy"
    @click="emit('transition', 'paid')"
  />
  <UButton
    v-if="invoice.status === 'issued'"
    icon="i-lucide-file-pen-line"
    :label="compact ? undefined : t('invoices.actions.reissue')"
    color="neutral"
    variant="outline"
    :loading="busy"
    @click="emit('reissue')"
  />
  <UButton
    v-if="invoice.status === 'issued'"
    icon="i-lucide-ban"
    :label="compact ? undefined : t('invoices.actions.void')"
    color="error"
    variant="ghost"
    :loading="busy"
    @click="emit('transition', 'void')"
  />
  <UButton
    v-if="invoice.status === 'paid'"
    icon="i-lucide-undo-2"
    :label="compact ? undefined : t('invoices.actions.unmarkPaid')"
    color="neutral"
    variant="outline"
    :loading="busy"
    @click="emit('transition', 'issued')"
  />
  <UButton
    v-if="invoice.status === 'void'"
    icon="i-lucide-file-pen-line"
    :label="compact ? undefined : t('invoices.actions.reissue')"
    color="neutral"
    variant="outline"
    :loading="busy"
    @click="emit('reissue')"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { InvoiceItem, InvoiceStatus } from 'taskview-api'

defineProps<{
  invoice: InvoiceItem
  compact: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  edit: []
  transition: [status: InvoiceStatus]
  reissue: []
}>()

const { t } = useI18n()
</script>
