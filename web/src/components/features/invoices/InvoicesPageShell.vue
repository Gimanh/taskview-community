<template>
  <UDashboardPanel :id="id">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <slot name="actions" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div
        v-if="showTabs"
        class="flex flex-col border-b border-default px-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6"
      >
        <div class="overflow-x-auto [scrollbar-width:none]">
          <UNavigationMenu
            :items="tabs"
            class="w-max"
          />
        </div>
        <USwitch
          v-if="includeArchived !== undefined"
          v-model="includeArchived"
          :label="t('invoices.showArchived')"
          size="sm"
          class="self-end pb-2 lg:self-auto lg:pb-0"
        />
      </div>
      <slot />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCurrenciesStore } from '@/stores/currencies.store'

withDefaults(
  defineProps<{
    id: string
    title: string
    showTabs?: boolean
  }>(),
  { showTabs: true },
)

const includeArchived = defineModel<boolean | undefined>('includeArchived', { default: undefined })

const { t } = useI18n()
const currenciesStore = useCurrenciesStore()

onMounted(() => currenciesStore.fetch())

const tabs = computed(() => [
  { label: t('invoices.page.title'), icon: 'i-lucide-receipt', to: { name: 'invoices' } },
  { label: t('invoices.counterparty.title'), icon: 'i-lucide-users', to: { name: 'invoices-counterparties' } },
  { label: t('invoices.seller.title'), icon: 'i-lucide-building-2', to: { name: 'invoices-sellers' } },
])
</script>
