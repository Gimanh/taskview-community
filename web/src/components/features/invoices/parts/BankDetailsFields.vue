<template>
  <div :class="sectionClass">
    <span class="text-sm font-medium text-default">{{ t('invoices.bank.title') }}</span>
    <UFormField :label="t('invoices.bank.bankName')">
      <UInput
        v-model="model.bankName"
        size="xl"
        :variant="inputVariant"
        :ui="inputUi"
        class="w-full"
      />
    </UFormField>
    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.bank.accountNumber')"
        class="flex-1"
      >
        <UInput
          v-model="model.accountNumber"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('invoices.bank.iban')"
        class="flex-1"
      >
        <UInput
          v-model="model.iban"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
    </div>
    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.bank.swift')"
        class="flex-1"
      >
        <UInput
          v-model="model.swift"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('invoices.bank.correspondentAccount')"
        class="flex-1"
      >
        <UInput
          v-model="model.correspondentAccount"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import type { BillingBankDetails } from 'taskview-api'

const model = defineModel<BillingBankDetails>({ required: true })

const { t } = useI18n()
const { inputVariant, inputUi, sectionClass } = useInvoiceFieldStyle()
</script>
