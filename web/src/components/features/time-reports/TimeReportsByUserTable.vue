<template>
  <UTable
    :data="byUser"
    :columns="columns"
    :empty="t('timeTracking.reports.empty')"
  />
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import type { TableColumn } from '@nuxt/ui'
import type { TimeReportByUserRow } from 'taskview-api'
import { useTimeReportsStore } from '@/stores/time-reports.store'
import { formatDuration } from '@/helpers/formatDuration'

const { t } = useI18n()
const store = useTimeReportsStore()
const { byUser } = storeToRefs(store)

const columns: TableColumn<TimeReportByUserRow>[] = [
  {
    accessorKey: 'userEmail',
    header: t('timeTracking.reports.colUser'),
    cell: ({ row }) => row.original.userEmail ?? `User #${row.original.userId}`,
  },
  {
    accessorKey: 'totalSeconds',
    header: t('timeTracking.reports.colHours'),
    cell: ({ row }) => h('span', { class: 'font-mono' }, formatDuration(row.original.totalSeconds)),
  },
  {
    accessorKey: 'entriesCount',
    header: t('timeTracking.reports.colEntries'),
  },
]
</script>
