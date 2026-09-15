<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :ui="{ content: isMobile ? 'flex flex-col' : 'lg:max-w-4xl max-h-[90vh] flex flex-col' }"
  >
    <template #content>
      <UCard :ui="{ root: 'flex flex-col flex-1 min-h-0', body: 'flex-1 min-h-0 overflow-y-auto' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ isEdit ? t('invoices.editTitle') : t('invoices.create') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <InvoiceForm
          v-model="formValue"
          :projects="projects"
          :sellers="sellerOptions"
          :counterparties="counterpartyOptions"
          @create-seller="sellerModalOpen = true"
          @create-counterparty="counterpartyModalOpen = true"
        />

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <span
              v-if="missing.length > 0"
              class="mr-auto text-xs text-muted"
            >
              {{ t('invoices.validation.fillIn') }}: {{ missing.join(', ') }}
            </span>
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
            <UButton
              :label="isEdit ? t('common.save') : t('invoices.create')"
              variant="soft"
              :disabled="!canSubmit"
              :loading="saving"
              @click="submit"
            />
          </div>
        </template>
      </UCard>

      <SellerFormModal
        v-model:open="sellerModalOpen"
        :organization-id="organizationId"
        @saved="formValue.sellerId = $event.id"
      />
      <CounterpartyFormModal
        v-model:open="counterpartyModalOpen"
        :organization-id="organizationId"
        @saved="formValue.counterpartyId = $event.id"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InvoiceForm from './InvoiceForm.vue'
import SellerFormModal from './SellerFormModal.vue'
import CounterpartyFormModal from './CounterpartyFormModal.vue'
import { useTaskView } from '@/composables/useTaskView'
import { useInvoicesStore } from '@/stores/invoices.store'
import { useSellersStore } from '@/stores/sellers.store'
import { useCounterpartiesStore } from '@/stores/counterparties.store'
import { todayIso } from '@/helpers/invoiceDates'
import { useInvoiceValidation } from '@/composables/useInvoiceValidation'
import type { InvoiceItem } from 'taskview-api'
import type { InvoiceFormValue, InvoiceSelectOption } from '@/types/invoices.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  organizationId: number
  projects: InvoiceSelectOption[]
  invoice?: InvoiceItem | null
}>()

const emit = defineEmits<{
  saved: [invoice: InvoiceItem]
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const invoicesStore = useInvoicesStore()
const sellersStore = useSellersStore()
const counterpartiesStore = useCounterpartiesStore()

const isEdit = computed(() => !!props.invoice)
const sellerModalOpen = ref(false)
const counterpartyModalOpen = ref(false)

const sellerOptions = computed<InvoiceSelectOption[]>(() =>
  sellersStore.active.map((seller) => ({ label: seller.name, value: seller.id })),
)
const counterpartyOptions = computed<InvoiceSelectOption[]>(() =>
  counterpartiesStore.active.map((item) => ({ label: item.name, value: item.id })),
)

function emptyValue(): InvoiceFormValue {
  const sellers = sellersStore.active
  const seller = sellers.length === 1 ? sellers[0] : null
  return {
    number: invoicesStore.suggestedNumber(),
    reference: '',
    goalId: props.projects.length === 1 ? props.projects[0].value : null,
    sellerId: seller?.id ?? null,
    counterpartyId: null,
    currencyCode: seller?.currencyCode ?? 'USD',
    issueDate: todayIso(),
    paymentTerms: 'net14',
    dueDate: null,
    periodFrom: null,
    periodTo: null,
    lines: [],
    discountType: 'percent',
    discountValue: 0,
    taxRate: 0,
    taxExempt: false,
    taxNote: seller?.taxNote ?? '',
    notes: '',
    terms: seller?.defaultTerms ?? '',
  }
}

function fromInvoice(invoice: InvoiceItem): InvoiceFormValue {
  return {
    number: invoice.number,
    reference: invoice.reference,
    goalId: invoice.goalId,
    sellerId: invoice.sellerId,
    counterpartyId: invoice.counterpartyId,
    currencyCode: invoice.currencyCode,
    issueDate: invoice.issueDate,
    paymentTerms: invoice.paymentTerms,
    dueDate: invoice.dueDate,
    periodFrom: invoice.periodFrom,
    periodTo: invoice.periodTo,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    taxRate: invoice.taxRate,
    taxExempt: invoice.taxExempt,
    taxNote: invoice.taxNote,
    notes: invoice.notes,
    terms: invoice.terms,
    lines: invoice.lines.map((line) => ({
      key: line.taskId !== null ? `task-${line.taskId}` : `manual-${line.id}`,
      taskId: line.taskId,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
  }
}

const formValue = ref<InvoiceFormValue>(props.invoice ? fromInvoice(props.invoice) : emptyValue())
const { missing, canSubmit } = useInvoiceValidation(formValue)

watch(open, async (value) => {
  if (!value) return
  await Promise.all([
    sellersStore.sellers.length ? null : sellersStore.fetch(props.organizationId),
    counterpartiesStore.counterparties.length ? null : counterpartiesStore.fetch(props.organizationId),
  ])
  formValue.value = props.invoice ? fromInvoice(props.invoice) : emptyValue()
})

const saving = ref(false)

async function submit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  const result = isEdit.value && props.invoice
    ? await invoicesStore.updateInvoice({ invoiceId: props.invoice.id, value: formValue.value })
    : await invoicesStore.createInvoice({ organizationId: props.organizationId, value: formValue.value })
  saving.value = false

  if ('error' in result) {
    const key = result.error === 'duplicate_number' ? 'duplicateNumber' : result.error === 'not_draft' ? 'notDraft' : 'saveFailed'
    toast.add({ title: t(`invoices.toasts.${key}`), color: 'error' })
    return
  }
  toast.add({ title: t(isEdit.value ? 'invoices.toasts.updated' : 'invoices.toasts.created'), color: 'success' })
  emit('saved', result.invoice)
  open.value = false
}
</script>
