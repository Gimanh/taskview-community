<template>
  <div
    v-if="compact"
    class="flex items-center justify-center gap-2"
    data-testid="sidebar-workspace-links"
  >
    <UTooltip
      v-for="link in links"
      :key="link.key"
      :text="link.label"
    >
      <UButton
        :icon="link.icon"
        color="neutral"
        variant="soft"
        size="lg"
        :ui="{ base: 'rounded-xl' }"
        :class="{ 'bg-primary/10 text-primary': link.active }"
        :aria-label="link.label"
        :to="link.to"
        :data-testid="`sidebar-workspace-link-${link.key}`"
      />
    </UTooltip>
  </div>
  <template v-else>
    <TvGoalLikeItem
      v-for="link in links"
      :key="link.key"
      variant="taskview"
      :to="link.to"
      :active="link.active"
      :data-testid="`sidebar-workspace-link-${link.key}`"
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '@/stores/organization.store'
import { useOrgPermissions } from '@/composables/useOrgPermissions'
import { getWorkspaceLinkProviders, isWorkspaceLinksCompact } from '@/extensions/registry'
import type { WorkspaceLink } from '@/extensions/types'
import TvGoalLikeItem from '@/components/features/base/TvGoalLikeItem.vue'

const { t } = useI18n()
const compact = isWorkspaceLinksCompact()
const route = useRoute()
const { currentOrg } = storeToRefs(useOrganizationStore())
const { isAdmin } = useOrgPermissions(() => currentOrg.value)
const extensionLinks = getWorkspaceLinkProviders().map((provide) => provide())

const ownLinks = computed(() => [
  { name: 'analytics', icon: 'i-lucide-bar-chart-3', label: t('userMenu.analytics') },
  ...(isAdmin.value ? [{ name: 'invoices', icon: 'i-lucide-receipt', label: t('userMenu.invoices') }] : []),
  { name: 'time-reports', icon: 'i-lucide-clock-4', label: t('userMenu.timeReports') },
  ...(isAdmin.value ? [{ name: 'import', icon: 'i-lucide-download', label: t('userMenu.import') }] : []),
])

const links = computed<WorkspaceLink[]>(() => [
  ...ownLinks.value.map((link) => ({
    key: link.name,
    icon: link.icon,
    label: link.label,
    to: { name: link.name },
    active: route.name === link.name,
  })),
  ...extensionLinks.flatMap((provided) => provided.value),
])
</script>
