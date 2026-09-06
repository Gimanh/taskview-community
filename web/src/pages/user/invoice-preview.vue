<template>
  <InvoicesPageShell
    id="invoice-preview"
    :title="invoice ? invoice.number : t('invoices.page.title')"
    :show-tabs="false"
  >
    <template #actions>
      <UButton
        icon="i-lucide-arrow-left"
        :label="isMobile ? undefined : t('invoices.preview.back')"
        color="neutral"
        variant="ghost"
        :to="{ name: 'invoices' }"
      />
      <InvoiceActions
        v-if="invoice"
        :invoice="invoice"
        :compact="isMobile"
        :busy="busy"
        @edit="formOpen = true"
        @transition="transition"
        @reissue="reissue"
      />
      <UButton
        v-if="invoice"
        icon="i-lucide-download"
        :label="isMobile ? undefined : t('invoices.preview.download')"
        :disabled="!pdfBlob"
        @click="download"
      />
    </template>

    <div
      v-if="!invoice"
      class="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center"
    >
      <UIcon
        :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-file-x'"
        class="size-12 text-muted"
        :class="{ 'animate-spin': loading }"
      />
      <p
        v-if="!loading"
        class="font-medium text-default"
      >
        {{ t('invoices.preview.notFound') }}
      </p>
    </div>
    <div
      v-else
      class="flex flex-col gap-3 p-2 lg:p-6"
    >
      <InvoiceStatusBar :invoice="invoice" />
      <InvoicePdfViewer
        :invoice-id="invoice.id"
        :title="invoice.number"
        :version="invoice.updatedAt"
        @loaded="pdfBlob = $event"
      />
    </div>

    <InvoiceFormModal
      v-if="invoice"
      v-model:open="formOpen"
      :organization-id="invoice.organizationId"
      :projects="projectOptions"
      :invoice="invoice"
    />
  </InvoicesPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { InvoiceStatus } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'
import { useGoalsStore } from '@/stores/goals.store'
import { useInvoicesStore } from '@/stores/invoices.store'
import { useInvoiceTransitionFeedback } from '@/composables/useInvoiceTransitionFeedback'
import InvoicesPageShell from '@/components/features/invoices/InvoicesPageShell.vue'
import InvoicePdfViewer from '@/components/features/invoices/InvoicePdfViewer.vue'
import InvoiceActions from '@/components/features/invoices/InvoiceActions.vue'
import InvoiceStatusBar from '@/components/features/invoices/InvoiceStatusBar.vue'
import InvoiceFormModal from '@/components/features/invoices/parts/InvoiceFormModal.vue'
import type { InvoiceSelectOption } from '@/types/invoices.types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const invoicesStore = useInvoicesStore()
const { goals } = storeToRefs(useGoalsStore())
const { isMobile } = useTaskView()
const { report } = useInvoiceTransitionFeedback()

const invoiceId = computed(() => Number(route.params.invoiceId))
const invoice = computed(() => invoicesStore.byId(invoiceId.value))
const loading = ref(false)
const busy = ref(false)
const formOpen = ref(false)
const pdfBlob = ref<Blob | null>(null)

watch(
  invoiceId,
  async (id) => {
    if (invoicesStore.byId(id)) return
    loading.value = true
    await invoicesStore.fetchById(id)
    loading.value = false
  },
  { immediate: true },
)

async function transition(status: InvoiceStatus) {
  if (!invoice.value || busy.value) return
  busy.value = true
  const result = await invoicesStore.transition({ invoiceId: invoice.value.id, status })
  busy.value = false
  report(result, status)
}

async function reissue() {
  if (!invoice.value || busy.value) return
  busy.value = true
  const result = await invoicesStore.reissue(invoice.value.id)
  busy.value = false
  report(result, 'void')
  if ('invoice' in result) router.push({ name: 'invoice-preview', params: { invoiceId: result.invoice.id } })
}

function download() {
  if (!pdfBlob.value || !invoice.value) return
  const link = document.createElement('a')
  link.href = URL.createObjectURL(pdfBlob.value)
  link.download = `${invoice.value.number}.pdf`
  link.click()
  URL.revokeObjectURL(link.href)
}

const projectOptions = computed<InvoiceSelectOption[]>(() =>
  goals.value
    .filter((goal) => goal.organizationId === invoice.value?.organizationId && !goal.archive)
    .map((goal) => ({ label: goal.name, value: goal.id })),
)
</script>
