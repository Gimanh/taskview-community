<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :ui="{ content: isMobile ? 'flex flex-col' : 'lg:max-w-2xl max-h-[90vh] flex flex-col' }"
  >
    <template #content>
      <UCard :ui="{ root: 'flex flex-col flex-1 min-h-0', body: 'flex-1 min-h-0 overflow-y-auto' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ isEdit ? t('invoices.counterparty.editTitle') : t('invoices.counterparty.create') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <CounterpartyForm v-model="formValue" />

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <span
              v-if="!canSubmit"
              class="mr-auto text-xs text-muted"
            >
              {{ t('invoices.validation.fillIn') }}: {{ t('invoices.party.name') }}
            </span>
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
            <UButton
              :label="isEdit ? t('common.save') : t('invoices.counterparty.create')"
              variant="soft"
              :disabled="!canSubmit"
              @click="submit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CounterpartyForm from './CounterpartyForm.vue'
import { useTaskView } from '@/composables/useTaskView'
import { useCounterpartiesStore } from '@/stores/counterparties.store'
import type { CounterpartyItem } from 'taskview-api'
import type { CounterpartyFormValue } from '@/types/invoices.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  organizationId: number
  counterparty?: CounterpartyItem | null
}>()

const emit = defineEmits<{
  saved: [counterparty: CounterpartyItem]
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const counterpartiesStore = useCounterpartiesStore()

const isEdit = computed(() => !!props.counterparty)

function emptyValue(): CounterpartyFormValue {
  return { kind: 'organization', name: '', legalName: '', address: '', email: '', phone: '', contactPerson: '', requisites: [] }
}

function fromCounterparty(counterparty: CounterpartyItem): CounterpartyFormValue {
  return {
    kind: counterparty.kind,
    name: counterparty.name,
    legalName: counterparty.legalName,
    address: counterparty.address,
    email: counterparty.email,
    phone: counterparty.phone,
    contactPerson: counterparty.contactPerson,
    requisites: counterparty.requisites.map((item) => ({ ...item })),
  }
}

const formValue = ref<CounterpartyFormValue>(props.counterparty ? fromCounterparty(props.counterparty) : emptyValue())
const canSubmit = computed(() => formValue.value.name.trim().length > 0)

watch(open, (value) => {
  if (value) formValue.value = props.counterparty ? fromCounterparty(props.counterparty) : emptyValue()
})

async function submit() {
  if (!canSubmit.value) return
  const counterparty = isEdit.value && props.counterparty
    ? await counterpartiesStore.updateCounterparty({ counterpartyId: props.counterparty.id, value: formValue.value })
    : await counterpartiesStore.createCounterparty({ organizationId: props.organizationId, value: formValue.value })
  if (!counterparty) {
    toast.add({ title: t('invoices.toasts.saveFailed'), color: 'error' })
    return
  }
  toast.add({
    title: t(isEdit.value ? 'invoices.counterparty.toasts.updated' : 'invoices.counterparty.toasts.created'),
    color: 'success',
  })
  emit('saved', counterparty)
  open.value = false
}
</script>
