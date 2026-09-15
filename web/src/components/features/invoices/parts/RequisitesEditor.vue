<template>
  <div :class="sectionClass">
    <span class="text-sm font-medium text-default">{{ t('invoices.requisites.title') }}</span>

    <div
      v-for="item in model"
      :key="item.key"
      class="grid grid-cols-[1fr_auto] gap-2 lg:grid-cols-[10rem_1fr_auto]"
    >
      <UInput
        v-model="item.label"
        :placeholder="t('invoices.requisites.label')"
        size="xl"
        :variant="inputVariant"
        :ui="inputUi"
        class="w-full"
      />
      <UInput
        v-model="item.value"
        :placeholder="t('invoices.requisites.value')"
        size="xl"
        :variant="inputVariant"
        :ui="inputUi"
        class="w-full col-start-1 lg:col-start-auto"
      />
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        class="row-start-1 col-start-2 lg:row-start-auto lg:col-start-auto"
        @click="remove(item.key)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-1">
      <UButton
        v-for="preset in availablePresets"
        :key="preset"
        :label="preset"
        color="neutral"
        variant="soft"
        size="xs"
        @click="add(preset)"
      />
      <UButton
        icon="i-lucide-plus"
        :label="t('invoices.requisites.add')"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="add('')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import type { BillingRequisite } from 'taskview-api'
import { REQUISITE_PRESETS } from '@/types/invoices.types'

const model = defineModel<BillingRequisite[]>({ required: true })

const { t } = useI18n()
const { inputVariant, inputUi, sectionClass } = useInvoiceFieldStyle()

const availablePresets = computed(() => {
  const used = new Set(model.value.map((item) => item.label.trim().toLowerCase()))
  return REQUISITE_PRESETS.filter((preset) => !used.has(preset.toLowerCase()))
})

function add(label: string) {
  model.value.push({ key: `req-${Date.now()}-${model.value.length}`, label, value: '' })
}

function remove(key: string) {
  model.value = model.value.filter((item) => item.key !== key)
}
</script>
