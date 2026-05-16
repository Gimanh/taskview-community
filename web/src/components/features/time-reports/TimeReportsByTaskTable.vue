<template>
  <UTable
    :data="byTask"
    :columns="columns"
    :empty="t('timeTracking.reports.empty')"
  />
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { TableColumn } from '@nuxt/ui'
import type { TimeReportByTaskRow } from 'taskview-api'
import { useTimeReportsStore } from '@/stores/time-reports.store'
import { formatDuration } from '@/helpers/formatDuration'

const { t } = useI18n()
const router = useRouter()
const store = useTimeReportsStore()
const { byTask } = storeToRefs(store)

const UButton = resolveComponent('UButton')

const openTask = (row: TimeReportByTaskRow) => {
  router.push({
    name: 'user',
    params: { projectId: String(row.goalId), taskId: String(row.taskId) },
  })
}

const columns: TableColumn<TimeReportByTaskRow>[] = [
  {
    accessorKey: 'taskDescription',
    header: t('timeTracking.reports.colTask'),
    cell: ({ row }) => row.original.taskDescription ?? `#${row.original.taskId}`,
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
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h(UButton, {
      icon: 'i-lucide-arrow-up-right',
      color: 'neutral',
      variant: 'ghost',
      size: 'xs',
      'aria-label': t('timeTracking.reports.openTask'),
      onClick: () => openTask(row.original),
    }),
  },
]
</script>
