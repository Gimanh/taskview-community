<template>
  <div class="flex flex-col gap-5">
    <InvoiceFormHeader
      v-model="model"
      :projects="projects"
      :sellers="sellers"
      :counterparties="counterparties"
      @select-project="selectProject"
      @select-seller="selectSeller"
      @create-seller="emit('create-seller')"
      @create-counterparty="emit('create-counterparty')"
    />

    <InvoiceFormDates v-model="model" />

    <InvoiceTaskPicker
      :goal-id="model.goalId"
      :currency-code="model.currencyCode"
      :selected-ids="selectedTaskIds"
      @toggle="toggleTask"
    />

    <InvoiceLinesEditor
      v-model="model.lines"
      :currency-code="model.currencyCode"
      @add="addManualLine"
      @remove="removeLine"
    />

    <InvoiceTotalsEditor v-model="model" />

    <div class="flex flex-col gap-3 lg:flex-row">
      <UFormField
        :label="t('invoices.fields.terms')"
        class="flex-1"
      >
        <UTextarea
          v-model="model.terms"
          :placeholder="t('invoices.fields.termsPlaceholder')"
          :rows="2"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('invoices.fields.notes')"
        class="flex-1"
      >
        <UTextarea
          v-model="model.notes"
          :placeholder="t('invoices.fields.notesPlaceholder')"
          :rows="2"
          size="xl"
          :variant="inputVariant"
          :ui="inputUi"
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'
import InvoiceFormHeader from './InvoiceFormHeader.vue'
import InvoiceFormDates from './InvoiceFormDates.vue'
import InvoiceTaskPicker from './InvoiceTaskPicker.vue'
import InvoiceLinesEditor from './InvoiceLinesEditor.vue'
import InvoiceTotalsEditor from './InvoiceTotalsEditor.vue'
import { useSellersStore } from '@/stores/sellers.store'
import { useInvoicesStore } from '@/stores/invoices.store'
import type { InvoiceFormValue, InvoiceSelectOption, InvoiceTaskOption } from '@/types/invoices.types'

const model = defineModel<InvoiceFormValue>({ required: true })

defineProps<{
  projects: InvoiceSelectOption[]
  sellers: InvoiceSelectOption[]
  counterparties: InvoiceSelectOption[]
}>()

const emit = defineEmits<{
  'create-seller': []
  'create-counterparty': []
}>()

const { t } = useI18n()
const { inputVariant, inputUi } = useInvoiceFieldStyle()
const sellersStore = useSellersStore()
const invoicesStore = useInvoicesStore()

const selectedTaskIds = computed(
  () => new Set(model.value.lines.filter((line) => line.taskId !== null).map((line) => line.taskId as number)),
)

function selectProject(goalId: number | null) {
  if (goalId === model.value.goalId) return
  model.value.goalId = goalId
  model.value.lines = model.value.lines.filter((line) => line.taskId === null)
  if (goalId !== null && model.value.counterpartyId === null) {
    model.value.counterpartyId = invoicesStore.lastCounterpartyForGoal(goalId)
  }
}

function selectSeller(sellerId: number | null) {
  model.value.sellerId = sellerId
  const seller = sellerId === null ? null : sellersStore.byId(sellerId)
  if (!seller) return
  model.value.currencyCode = seller.currencyCode
  if (!model.value.terms.trim()) model.value.terms = seller.defaultTerms
  if (!model.value.taxNote.trim()) model.value.taxNote = seller.taxNote
}

function toggleTask(task: InvoiceTaskOption) {
  const index = model.value.lines.findIndex((line) => line.taskId === task.id)
  if (index >= 0) {
    model.value.lines.splice(index, 1)
    return
  }
  model.value.lines.push({
    key: `task-${task.id}`,
    taskId: task.id,
    description: task.description,
    unit: 'service',
    quantity: 1,
    unitPrice: task.amount,
  })
}

function addManualLine() {
  model.value.lines.push({
    key: `manual-${Date.now()}-${model.value.lines.length}`,
    taskId: null,
    description: '',
    unit: 'service',
    quantity: 1,
    unitPrice: 0,
  })
}

function removeLine(key: string) {
  model.value.lines = model.value.lines.filter((line) => line.key !== key)
}

</script>
