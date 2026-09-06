<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="t('invoices.counterparty.kind')">
      <UTabs
        v-model="model.kind"
        :items="kindItems"
        :content="false"
        size="lg"
        class="w-full lg:w-80"
        :ui="{ list: 'rounded-14', trigger: 'rounded-10', indicator: 'rounded-10' }"
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
