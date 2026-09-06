<template>
  <InvoicesPageShell
    id="invoices"
    v-model:include-archived="invoicesStore.includeArchived"
    :title="t('invoices.page.title')"
    :show-tabs="isAdmin"
    @update:include-archived="reload"
  >
    <template #actions>
      <UButton
        v-if="isAdmin"
        icon="i-lucide-plus"
        :label="t('invoices.create')"
        @click="formOpen = true"
      />
    </template>

    <InvoicesNoPermission v-if="!isAdmin" />
    <template v-else>
      <InvoicesEmptyState v-if="invoices.length === 0 && !invoicesStore.loading" />
      <InvoicesList
        v-else
        :invoices="invoices"
        @open="openPreview"
      />
    </template>

    <InvoiceFormModal
      v-if="orgId !== null"
      v-model:open="formOpen"
      :organization-id="orgId"
      :projects="projectOptions"
      @saved="openPreview"
    />
  </InvoicesPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { InvoiceItem } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useInvoicesStore } from '@/stores/invoices.store'
import { useOrgPermissions } from '@/composables/useOrgPermissions'
import InvoicesPageShell from '@/components/features/invoices/InvoicesPageShell.vue'
import InvoicesEmptyState from '@/components/features/invoices/InvoicesEmptyState.vue'
import InvoicesNoPermission from '@/components/features/invoices/InvoicesNoPermission.vue'
import InvoicesList from '@/components/features/invoices/InvoicesList.vue'
import InvoiceFormModal from '@/components/features/invoices/parts/InvoiceFormModal.vue'
import type { InvoiceSelectOption } from '@/types/invoices.types'

const { t } = useI18n()
const router = useRouter()
const { currentOrg } = storeToRefs(useOrganizationStore())
const { goals } = storeToRefs(useGoalsStore())
const invoicesStore = useInvoicesStore()
const { invoices } = storeToRefs(invoicesStore)
const { isAdmin } = useOrgPermissions(() => currentOrg.value)

const orgId = computed(() => currentOrg.value?.id ?? null)

const projectOptions = computed<InvoiceSelectOption[]>(() =>
  goals.value
    .filter((goal) => goal.organizationId === orgId.value && !goal.archive)
    .map((goal) => ({ label: goal.name, value: goal.id })),
)

const formOpen = ref(false)

function reload() {
  if (orgId.value !== null && isAdmin.value) invoicesStore.fetch(orgId.value)
}

watch([orgId, isAdmin], reload, { immediate: true })

function openPreview(invoice: InvoiceItem) {
  router.push({ name: 'invoice-preview', params: { invoiceId: invoice.id } })
}
</script>
