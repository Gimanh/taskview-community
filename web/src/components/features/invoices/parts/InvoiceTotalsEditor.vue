<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-start">
    <div class="flex flex-1 flex-col gap-3">
      <div class="flex gap-2">
        <UFormField
          :label="t('invoices.totals.discount')"
          class="flex-1"
        >
          <UInput
            :model-value="String(model.discountValue)"
            type="number"
            min="0"
            step="0.01"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
            @update:model-value="model.discountValue = toNumber($event)"
          />
        </UFormField>
        <UFormField
          :label="t('invoices.totals.discountType')"
          class="w-32"
        >
          <USelect
            v-model="model.discountType"
            :items="discountItems"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex items-end gap-2">
        <UFormField
          :label="t('invoices.totals.taxRate')"
          class="w-32"
        >
          <UInput
            :model-value="String(model.taxRate)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            :disabled="model.taxExempt"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
            @update:model-value="model.taxRate = Math.min(toNumber($event), 100)"
          >
            <template #trailing>
              <span class="text-xs text-dimmed">%</span>
            </template>
          </UInput>
        </UFormField>
        <UFormField
          :label="t('invoices.totals.taxExempt')"
          class="flex-1"
        >
          <div class="flex h-8 items-center">
            <USwitch v-model="model.taxExempt" />
          </div>
        </UFormField>
      </div>

      <UFormField
        v-if="model.taxExempt"
        :label="t('invoices.totals.taxNote')"
      >
        <UInput
          v-model="model.taxNote"
          :placeholder="t('invoices.seller.taxNotePlaceholder')"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
    </div>

    <dl class="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 rounded-14 bg-elevated px-4 py-3 text-sm lg:w-72">
      <dt class="text-muted">
        {{ t('invoices.totals.subtotal') }}
      </dt>
      <dd class="text-right tabular-nums">
        {{ money(totals.subtotal) }}
      </dd>
      <dt class="text-muted">
        {{ t('invoices.totals.discount') }}
      </dt>
      <dd class="text-right tabular-nums">
        −{{ money(totals.discount) }}
      </dd>
      <dt class="text-muted">
        {{ t('invoices.totals.tax') }}
      </dt>
      <dd class="text-right tabular-nums">
        {{ money(totals.tax) }}
      </dd>
      <dt class="font-semibold text-default">
        {{ t('invoices.total') }}
      </dt>
      <dd class="text-right font-semibold tabular-nums text-default">
        {{ money(totals.total) }}
      </dd>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import { computeInvoiceTotals, formatMoney } from '@/helpers/money'
import type { InvoiceDiscountType } from 'taskview-api'
import type { InvoiceFormValue } from '@/types/invoices.types'

const model = defineModel<InvoiceFormValue>({ required: true })

const { t, locale } = useI18n()
const { inputVariant, inputUi } = useInvoiceFieldStyle()

const discountItems = computed(() => [
  { label: '%', value: 'percent' as InvoiceDiscountType },
  { label: model.value.currencyCode, value: 'amount' as InvoiceDiscountType },
])

const totals = computed(() => computeInvoiceTotals(model.value))

function toNumber(value: string | number): number {
  const parsed = Number(String(value).trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function money(amount: number): string {
  return formatMoney({ amount, currencyCode: model.value.currencyCode, locale: locale.value })
}
</script>
