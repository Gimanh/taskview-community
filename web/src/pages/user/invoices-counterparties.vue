<template>
  <InvoicesPageShell
    id="invoices-counterparties"
    v-model:include-archived="store.includeArchived"
    :title="t('invoices.counterparty.title')"
    :show-tabs="isAdmin"
    @update:include-archived="reload"
  >
    <template #actions>
      <UButton
        v-if="isAdmin"
        icon="i-lucide-plus"
        :label="t('invoices.counterparty.create')"
        @click="openCreate"
      />
    </template>

    <InvoicesNoPermission v-if="!isAdmin" />
    <template v-else>
      <div
        v-if="counterparties.length === 0 && !store.loading"
        class="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center"
      >
        <UIcon
          name="i-lucide-users"
          class="size-12 text-muted"
        />
        <p class="font-medium text-default">
          {{ t('invoices.counterparty.empty') }}
        </p>
        <p class="text-sm text-muted max-w-md">
          {{ t('invoices.counterparty.emptyHint') }}
        </p>
      </div>
      <div
        v-else
        class="flex flex-col gap-2 p-2 lg:p-6"
      >
        <PartyListItem
          v-for="item in counterparties"
          :key="item.id"
          :icon="item.kind === 'person' ? 'i-lucide-user' : 'i-lucide-building'"
          :title="item.name"
          :subtitle="[item.legalName, item.email].filter(Boolean).join(' · ')"
          :archived="item.archived"
          @edit="openEdit(item)"
          @archive="store.setArchived({ id: item.id, archived: $event })"
          @delete="remove(item.id)"
        />
      </div>
    </template>

    <CounterpartyFormModal
      v-if="orgId !== null"
      v-model:open="formOpen"
      :organization-id="orgId"
      :counterparty="editing"
    />
  </InvoicesPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import type { CounterpartyItem } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'
import { useCounterpartiesStore } from '@/stores/counterparties.store'
import { useOrgPermissions } from '@/composables/useOrgPermissions'
import InvoicesPageShell from '@/components/features/invoices/InvoicesPageShell.vue'
import InvoicesNoPermission from '@/components/features/invoices/InvoicesNoPermission.vue'
import PartyListItem from '@/components/features/invoices/PartyListItem.vue'
import CounterpartyFormModal from '@/components/features/invoices/parts/CounterpartyFormModal.vue'

const { t } = useI18n()
const toast = useToast()
const { currentOrg } = storeToRefs(useOrganizationStore())
const store = useCounterpartiesStore()
const { counterparties } = storeToRefs(store)
const { isAdmin } = useOrgPermissions(() => currentOrg.value)

const orgId = computed(() => currentOrg.value?.id ?? null)

function reload() {
  if (orgId.value !== null && isAdmin.value) store.fetch(orgId.value)
}

watch([orgId, isAdmin], reload, { immediate: true })

const formOpen = ref(false)
const editing = ref<CounterpartyItem | null>(null)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(item: CounterpartyItem) {
  editing.value = item
  formOpen.value = true
}

async function remove(id: number) {
  const result = await store.deleteCounterparty(id)
  if (result === 'in_use') toast.add({ title: t('invoices.toasts.inUse'), color: 'warning' })
  else if (result === 'failed') toast.add({ title: t('invoices.toasts.saveFailed'), color: 'error' })
}
</script>
