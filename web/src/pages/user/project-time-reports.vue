<template>
  <UDashboardPanel id="project-time-reports">
    <template #header>
      <UDashboardNavbar :title="t('timeTracking.reports.title')" />
    </template>
    <template #body>
      <TimeReportsLayout
        v-if="orgId !== null && projectId !== null"
        :organization-id="orgId"
        :available-projects="visibleProjects"
        :default-goal-ids="defaultGoalIds"
        :can-filter-by-user="canManageAll"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { TvPermissions } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'
import { useGoalsStore } from '@/stores/goals.store'
import TimeReportsLayout from '@/components/features/time-reports/TimeReportsLayout.vue'

const { t } = useI18n()
const route = useRoute()
const orgStore = useOrganizationStore()
const goalsStore = useGoalsStore()
const { currentOrg } = storeToRefs(orgStore)
const { goals } = storeToRefs(goalsStore)

const orgId = computed(() => currentOrg.value?.id ?? null)
const projectId = computed(() => {
  const raw = route.params.projectId
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

const currentGoal = computed(() => goals.value.find((g) => g.id === projectId.value))

const visibleProjects = computed(() => (currentGoal.value ? [currentGoal.value] : []))

const defaultGoalIds = computed(() => (projectId.value !== null ? [projectId.value] : undefined))

const canManageAll = computed(
  () => currentGoal.value?.permissions[TvPermissions.TIMETRACKING_CAN_MANAGE_ALL] === true,
)
</script>
