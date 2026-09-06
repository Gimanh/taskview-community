<template>
  <InvoicesPageShell
    id="invoices-sellers"
    v-model:include-archived="store.includeArchived"
    :title="t('invoices.seller.title')"
    :show-tabs="isAdmin"
    @update:include-archived="reload"
  >
    <template #actions>
      <UButton
        v-if="isAdmin"
        icon="i-lucide-plus"
        :label="t('invoices.seller.create')"
        @click="openCreate"
      />
    </template>

    <InvoicesNoPermission v-if="!isAdmin" />
    <template v-else>
      <div
        v-if="sellers.length === 0 && !store.loading"
        class="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center"
      >
        <UIcon
          name="i-lucide-building-2"
          class="size-12 text-muted"
        />
        <p class="font-medium text-default">
          {{ t('invoices.seller.empty') }}
        </p>
        <p class="text-sm text-muted max-w-md">
          {{ t('invoices.seller.emptyHint') }}
        </p>
      </div>
      <div
        v-else
        class="flex flex-col gap-2 p-2 lg:p-6"
      >
        <PartyListItem
          v-for="item in sellers"
          :key="item.id"
          icon="i-lucide-building-2"
          :title="item.name"
          :subtitle="[item.legalName, item.currencyCode].filter(Boolean).join(' · ')"
          :archived="item.archived"
          @edit="openEdit(item)"
          @archive="store.setArchived({ id: item.id, archived: $event })"
          @delete="remove(item.id)"
        />
      </div>
    </template>

    <SellerFormModal
      v-if="orgId !== null"
      v-model:open="formOpen"
      :organization-id="orgId"
      :seller="editing"
    />
  </InvoicesPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import type { SellerItem } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'
import { useSellersStore } from '@/stores/sellers.store'
import { useOrgPermissions } from '@/composables/useOrgPermissions'
import InvoicesPageShell from '@/components/features/invoices/InvoicesPageShell.vue'
import InvoicesNoPermission from '@/components/features/invoices/InvoicesNoPermission.vue'
import PartyListItem from '@/components/features/invoices/PartyListItem.vue'
import SellerFormModal from '@/components/features/invoices/parts/SellerFormModal.vue'

const { t } = useI18n()
const toast = useToast()
const { currentOrg } = storeToRefs(useOrganizationStore())
const store = useSellersStore()
const { sellers } = storeToRefs(store)
const { isAdmin } = useOrgPermissions(() => currentOrg.value)

const orgId = computed(() => currentOrg.value?.id ?? null)

function reload() {
  if (orgId.value !== null && isAdmin.value) store.fetch(orgId.value)
}

watch([orgId, isAdmin], reload, { immediate: true })

const formOpen = ref(false)
const editing = ref<SellerItem | null>(null)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(item: SellerItem) {
  editing.value = item
  formOpen.value = true
}

async function remove(id: number) {
  const result = await store.deleteSeller(id)
  if (result === 'in_use') toast.add({ title: t('invoices.toasts.inUse'), color: 'warning' })
  else if (result === 'failed') toast.add({ title: t('invoices.toasts.saveFailed'), color: 'error' })
}
</script>
