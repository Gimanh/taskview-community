<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.party.name')"
        required
        class="flex-1"
      >
        <UInput
          v-model="model.name"
          :placeholder="t('invoices.party.namePlaceholder')"
          autofocus
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('invoices.party.legalName')"
        class="flex-1"
      >
        <UInput
          v-model="model.legalName"
          :placeholder="t('invoices.party.legalNamePlaceholder')"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField :label="t('invoices.party.address')">
      <UTextarea
        v-model="model.address"
        :rows="2"
        size="xl"
        :variant="inputVariant"
        :ui="inputUi"
        class="w-full"
      />
    </UFormField>

    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.party.email')"
        class="flex-1"
      >
        <UInput
          v-model="model.email"
          type="email"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('invoices.party.phone')"
        class="flex-1"
      >
        <UInput
          v-model="model.phone"
          type="tel"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
    </div>

    <RequisitesEditor v-model="model.requisites" />
  </div>
</template>

<script setup lang="ts" generic="T extends PartyFields">
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import RequisitesEditor from './RequisitesEditor.vue'
import type { PartyFields } from '@/types/invoices.types'

const model = defineModel<T>({ required: true })

const { t } = useI18n()
const { inputVariant, inputUi } = useInvoiceFieldStyle()
</script>
