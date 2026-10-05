<template>
  <TvGoalLikeItem
    v-for="link in links"
    :key="link.name"
    variant="taskview"
    :to="{ name: link.name }"
    :active="route.name === link.name"
  >
    <div class="flex items-center gap-2 w-full">
      <UIcon
        :name="link.icon"
        class="size-4 shrink-0"
      />
      <span>{{ link.label }}</span>
    </div>
  </TvGoalLikeItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '@/stores/organization.store'
import { useOrgPermissions } from '@/composables/useOrgPermissions'
import TvGoalLikeItem from '@/components/features/base/TvGoalLikeItem.vue'

const { t } = useI18n()
const route = useRoute()
const { currentOrg } = storeToRefs(useOrganizationStore())
const { isAdmin } = useOrgPermissions(() => currentOrg.value)

const links = computed(() => [
  { name: 'strategy', icon: 'i-lucide-target', label: 'Strategic Portfolio' },
  { name: 'annual-planning', icon: 'i-lucide-calendar-check', label: 'Annual Planning' },
  { name: 'analytics', icon: 'i-lucide-bar-chart-3', label: t('userMenu.analytics') },
  { name: 'erp-monitoring', icon: 'i-lucide-dollar-sign', label: 'ERP Budgeting' },
  { name: 'risks', icon: 'i-lucide-shield-alert', label: 'Risk Register' },
  ...(isAdmin.value ? [{ name: 'invoices', icon: 'i-lucide-receipt', label: t('userMenu.invoices') }] : []),
  { name: 'time-reports', icon: 'i-lucide-clock-4', label: t('userMenu.timeReports') },
])
</script>
