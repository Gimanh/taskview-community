<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.fields.number')"
        required
        class="flex-1"
      >
        <UInput
          v-model="model.number"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('invoices.fields.reference')"
        class="flex-1"
      >
        <UInput
          v-model="model.reference"
          :placeholder="t('invoices.fields.referencePlaceholder')"
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

    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.seller.title')"
        required
        class="flex-1"
      >
        <div class="flex gap-2">
          <USelectMenu
            :model-value="model.sellerId ?? undefined"
            :items="sellers"
            value-key="value"
            :placeholder="t('invoices.fields.sellerPlaceholder')"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
            @update:model-value="emit('select-seller', $event ?? null)"
          />
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            :variant="inputVariant"
            size="xl"
            :ui="inputUi"
            @click="emit('create-seller')"
          />
        </div>
      </UFormField>
      <UFormField
        :label="t('invoices.counterparty.title')"
        required
        class="flex-1"
      >
        <div class="flex gap-2">
          <USelectMenu
            :model-value="model.counterpartyId ?? undefined"
            :items="counterparties"
            value-key="value"
            :placeholder="t('invoices.fields.counterpartyPlaceholder')"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
            @update:model-value="model.counterpartyId = $event ?? null"
          />
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            :variant="inputVariant"
            size="xl"
            :ui="inputUi"
            @click="emit('create-counterparty')"
          />
        </div>
      </UFormField>
      <UFormField
        :label="t('invoices.fields.project')"
        required
        class="flex-1"
      >
        <USelectMenu
          :model-value="model.goalId ?? undefined"
          :items="projects"
          value-key="value"
          :placeholder="t('invoices.fields.project')"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
          @update:model-value="emit('select-project', $event ?? null)"
        />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import { storeToRefs } from 'pinia'
import { useCurrenciesStore } from '@/stores/currencies.store'
import type { InvoiceFormValue, InvoiceSelectOption } from '@/types/invoices.types'

const model = defineModel<InvoiceFormValue>({ required: true })

defineProps<{
  projects: InvoiceSelectOption[]
  sellers: InvoiceSelectOption[]
  counterparties: InvoiceSelectOption[]
}>()

const emit = defineEmits<{
  'select-project': [goalId: number | null]
  'select-seller': [sellerId: number | null]
  'create-seller': []
  'create-counterparty': []
}>()

const { t } = useI18n()
const { inputVariant, inputUi } = useInvoiceFieldStyle()

const { options: currencyItems } = storeToRefs(useCurrenciesStore())
</script>
