<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-3 lg:flex-row">
      <InvoiceDateField
        v-model="model.issueDate"
        :label="t('invoices.fields.issueDate')"
        required
      />
      <UFormField
        :label="t('invoices.fields.paymentTerms')"
        class="flex-1"
      >
        <USelect
          v-model="model.paymentTerms"
          :items="termsItems"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <InvoiceDateField
        v-model="model.dueDate"
        :label="t('invoices.fields.dueDate')"
        :min-date="model.issueDate"
        :disabled="model.paymentTerms !== 'custom'"
      />
    </div>
    <div class="flex flex-col gap-3 lg:flex-row">
      <InvoiceDateField
        v-model="model.periodFrom"
        :label="t('invoices.fields.periodFrom')"
      />
      <InvoiceDateField
        v-model="model.periodTo"
        :label="t('invoices.fields.periodTo')"
        :min-date="model.periodFrom"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import InvoiceDateField from './InvoiceDateField.vue'
import { addDays } from '@/helpers/invoiceDates'
import type { InvoicePaymentTerms } from 'taskview-api'
import { PAYMENT_TERMS_DAYS, type InvoiceFormValue } from '@/types/invoices.types'

const model = defineModel<InvoiceFormValue>({ required: true })

const { t } = useI18n()
const { inputVariant, inputUi } = useInvoiceFieldStyle()

const termsItems = computed(() =>
  (Object.keys(PAYMENT_TERMS_DAYS) as InvoicePaymentTerms[]).map((value) => ({
    label: t(`invoices.paymentTerms.${value}`),
    value,
  })),
)

watch(
  () => [model.value.issueDate, model.value.paymentTerms] as const,
  ([issueDate, terms]) => {
    const days = PAYMENT_TERMS_DAYS[terms]
    if (days === null || !issueDate) return
    model.value.dueDate = addDays({ date: issueDate, days })
  },
  { immediate: true },
)
</script>
