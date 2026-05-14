<template>
  <UTabs
    v-model="active"
    :items="items"
    class="w-full"
  >
    <template #by-task>
      <TimeReportsByTaskTable />
    </template>
    <template #by-user>
      <TimeReportsByUserTable />
    </template>
    <template #by-day>
      <TimeReportsByDayTable />
    </template>
  </UTabs>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTimeReportsStore } from '@/stores/time-reports.store'
import TimeReportsByTaskTable from './TimeReportsByTaskTable.vue'
import TimeReportsByUserTable from './TimeReportsByUserTable.vue'
import TimeReportsByDayTable from './TimeReportsByDayTable.vue'

const { t } = useI18n()
const store = useTimeReportsStore()
const { view } = storeToRefs(store)

const items = computed(() => [
  { label: t('timeTracking.reports.byTask'), slot: 'by-task' as const, value: 'by-task' },
  { label: t('timeTracking.reports.byUser'), slot: 'by-user' as const, value: 'by-user' },
  { label: t('timeTracking.reports.byDay'), slot: 'by-day' as const, value: 'by-day' },
])

const active = computed({
  get: () => view.value,
  set: (v) => store.setView(v as 'by-task' | 'by-user' | 'by-day'),
})
</script>
