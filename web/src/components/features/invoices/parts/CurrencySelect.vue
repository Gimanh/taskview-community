<template>
  <USelectMenu
    v-model="model"
    :items="options"
    value-key="value"
    :search-input="false"
    size="xl"
    :variant="inputVariant"
    :ui="inputUi"
    class="w-full"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCurrenciesStore } from '@/stores/currencies.store'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'

const model = defineModel<string>({ required: true })

const { options } = storeToRefs(useCurrenciesStore())
const { inputVariant, inputUi } = useInvoiceFieldStyle()
</script>
