<template>
  <UDashboardPanel id="time-reports">
    <template #header>
      <UDashboardNavbar :title="t('timeTracking.reports.title')" />
    </template>
    <template #body>
      <TimeReportsNoPermission v-if="orgId !== null && visibleProjects.length === 0" />
      <TimeReportsLayout
        v-else-if="orgId !== null"
        :organization-id="orgId"
        :available-projects="visibleProjects"
        :can-filter-by-user="hasAnyManageAll"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { TvPermissions } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'
import { useGoalsStore } from '@/stores/goals.store'
import TimeReportsLayout from '@/components/features/time-reports/TimeReportsLayout.vue'
import TimeReportsNoPermission from '@/components/features/time-reports/TimeReportsNoPermission.vue'

const { t } = useI18n()
const orgStore = useOrganizationStore()
const goalsStore = useGoalsStore()
const { currentOrg } = storeToRefs(orgStore)
const { goals } = storeToRefs(goalsStore)

const orgId = computed(() => currentOrg.value?.id ?? null)

const visibleProjects = computed(() =>
  goals.value.filter(
    (g) =>
      g.organizationId === orgId.value &&
      (g.permissions[TvPermissions.TIMETRACKING_CAN_VIEW] ||
        g.permissions[TvPermissions.TIMETRACKING_CAN_MANAGE_ALL]),
  ),
)

const hasAnyManageAll = computed(() =>
  visibleProjects.value.some((g) => g.permissions[TvPermissions.TIMETRACKING_CAN_MANAGE_ALL]),
)
</script>
