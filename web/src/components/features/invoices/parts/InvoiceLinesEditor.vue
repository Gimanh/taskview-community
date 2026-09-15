<template>
  <div
    :class="sectionClass"
    class="gap-4 md:gap-3"
  >
    <span class="text-sm font-medium text-default">{{ t('invoices.lines.title') }} <span class="text-error">*</span></span>

    <p
      v-if="lines.length === 0"
      class="py-3 text-sm text-muted"
    >
      {{ t('invoices.lines.empty') }}
    </p>

    <div
      v-else
      class="hidden md:grid md:grid-cols-[1fr_9rem_5.5rem_7.5rem_6.5rem_2.5rem] gap-2 px-1 text-xs text-muted"
    >
      <span>{{ t('invoices.lines.description') }}</span>
      <span>{{ t('invoices.lines.unit') }}</span>
      <span>{{ t('invoices.lines.quantity') }}</span>
      <span>{{ t('invoices.lines.price') }}</span>
      <span class="text-right">{{ t('invoices.lines.amount') }}</span>
      <span />
    </div>

    <div
      v-for="line in lines"
      :key="line.key"
      class="grid grid-cols-[1fr_auto] gap-x-2 gap-y-3 rounded-[20px] bg-elevated p-3 shadow-sm dark:max-sm:bg-default/70 dark:shadow-none md:grid-cols-[1fr_9rem_5.5rem_7.5rem_6.5rem_2.5rem] md:items-center md:gap-2 md:bg-transparent md:p-0 md:shadow-none"
    >
      <UInput
        v-model="line.description"
        :placeholder="t('invoices.lines.description')"
        :disabled="line.taskId !== null"
        size="xl"
        :variant="inputVariant"
        :ui="inputUi"
        class="w-full"
      />
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        class="self-center md:order-last"
        @click="emit('remove', line.key)"
      />
      <div class="col-span-2 grid grid-cols-[1.2fr_0.8fr_1.3fr] gap-2 md:contents">
        <UFormField
          :label="t('invoices.lines.unit')"
          :ui="fieldUi"
        >
          <USelect
            v-model="line.unit"
            :items="unitItems"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('invoices.lines.quantity')"
          :ui="fieldUi"
        >
          <UInput
            :model-value="String(line.quantity)"
            type="number"
            min="0"
            step="0.01"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
            @update:model-value="line.quantity = toNumber($event)"
          />
        </UFormField>
        <UFormField
          :label="t('invoices.lines.price')"
          :ui="fieldUi"
        >
          <UInput
            :model-value="String(line.unitPrice)"
            type="number"
            min="0"
            step="0.01"
            size="xl"
            :variant="inputVariant"
            :ui="inputUi"
            class="w-full"
            @update:model-value="line.unitPrice = toNumber($event)"
          />
        </UFormField>
      </div>
      <div class="col-span-2 flex items-center justify-between border-t border-default pt-2 text-sm md:hidden">
        <span class="text-muted">{{ t('invoices.lines.amount') }}</span>
        <span class="font-semibold tabular-nums text-default">
          {{ formatMoney({ amount: lineAmount(line.quantity, line.unitPrice), currencyCode, locale }) }}
        </span>
      </div>
      <span class="hidden text-right text-sm tabular-nums text-default md:block">
        {{ formatMoney({ amount: lineAmount(line.quantity, line.unitPrice), currencyCode, locale }) }}
      </span>
    </div>

    <div>
      <UButton
        icon="i-lucide-plus"
        :label="t('invoices.lines.addManual')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('add')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import { formatMoney, lineAmount } from '@/helpers/money'
import { INVOICE_UNITS, type InvoiceFormLine } from '@/types/invoices.types'

const lines = defineModel<InvoiceFormLine[]>({ required: true })

defineProps<{
  currencyCode: string
}>()

const emit = defineEmits<{
  add: []
  remove: [key: string]
}>()

const { t, locale } = useI18n()
const { inputVariant, inputUi, sectionClass } = useInvoiceFieldStyle()

const fieldUi = { label: 'md:hidden', container: 'md:mt-0' }

const unitItems = computed(() => INVOICE_UNITS.map((unit) => ({ label: t(`invoices.units.${unit}`), value: unit })))

function toNumber(value: string | number): number {
  const parsed = Number(String(value).trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}
</script>
