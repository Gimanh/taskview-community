<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('invoices.counterparty.kind')">
      <UTabs
        v-model="model.kind"
        :items="kindItems"
        :content="false"
        size="xl"
        class="w-full"
        :ui="{ list: 'rounded-xl p-1', trigger: 'rounded-lg', indicator: 'rounded-lg' }"
      />
    </UFormField>

    <PartyFields v-model="model" />

    <UFormField :label="t('invoices.counterparty.contactPerson')">
      <UInput
        v-model="model.contactPerson"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PartyFields from './PartyFields.vue'
import type { CounterpartyKind } from 'taskview-api'
import type { CounterpartyFormValue } from '@/types/invoices.types'

const model = defineModel<CounterpartyFormValue>({ required: true })

const { t } = useI18n()

const kindItems = computed(() => [
  { label: t('invoices.counterparty.kinds.organization'), value: 'organization' as CounterpartyKind },
  { label: t('invoices.counterparty.kinds.person'), value: 'person' as CounterpartyKind },
])

</script>
