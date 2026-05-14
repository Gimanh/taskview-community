<template>
  <div class="flex flex-col gap-4 p-4">
    <TimeReportsFilters
      :available-projects="availableProjects"
      :can-filter-by-user="canFilterByUser"
    />

    <TimeReportsKpis />

    <TimeReportsViewTabs />

    <TimeReportsEntriesList />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import type { GoalItem } from 'taskview-api'
import { useTimeReportsStore } from '@/stores/time-reports.store'
import TimeReportsFilters from './TimeReportsFilters.vue'
import TimeReportsKpis from './TimeReportsKpis.vue'
import TimeReportsViewTabs from './TimeReportsViewTabs.vue'
import TimeReportsEntriesList from './TimeReportsEntriesList.vue'

const props = defineProps<{
  organizationId: number
  availableProjects: GoalItem[]
  defaultGoalIds?: number[]
  canFilterByUser: boolean
}>()

const store = useTimeReportsStore()

onMounted(() => {
  store.init({ organizationId: props.organizationId, goalIds: props.defaultGoalIds ?? [] })
})

watch(
  () => props.organizationId,
  (id) => {
    store.setOrganization(id)
  },
)

watch(
  () => props.defaultGoalIds,
  (ids) => {
    store.setGoalIds(ids ?? [])
  },
)
</script>
