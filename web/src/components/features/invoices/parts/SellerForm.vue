<template>
  <div class="flex flex-col gap-4">
    <PartyFields v-model="model" />

    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.seller.logoUrl')"
        class="flex-1"
      >
        <UInput
          v-model="model.logoUrl"
          placeholder="https://"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('invoices.fields.currency')"
        class="lg:w-40"
      >
        <USelectMenu
          v-model="model.currencyCode"
          :items="currencyItems"
          value-key="value"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
    </div>

    <BankDetailsFields v-model="model.bank" />

    <UFormField :label="t('invoices.seller.taxNote')">
      <UInput
        v-model="model.taxNote"
        :placeholder="t('invoices.seller.taxNotePlaceholder')"
        size="xl"
        :variant="inputVariant"
        :ui="inputUi"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('invoices.seller.defaultTerms')">
      <UTextarea
        v-model="model.defaultTerms"
        :placeholder="t('invoices.seller.defaultTermsPlaceholder')"
        :rows="2"
        size="xl"
        :variant="inputVariant"
        :ui="inputUi"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import PartyFields from './PartyFields.vue'
import BankDetailsFields from './BankDetailsFields.vue'
import { storeToRefs } from 'pinia'
import { useCurrenciesStore } from '@/stores/currencies.store'
import type { SellerFormValue } from '@/types/invoices.types'

const model = defineModel<SellerFormValue>({ required: true })

const { t } = useI18n()
const { inputVariant, inputUi } = useInvoiceFieldStyle()

const { options: currencyItems } = storeToRefs(useCurrenciesStore())

</script>
