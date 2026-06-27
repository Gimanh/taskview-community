<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <UCard :ui="{ root: 'rounded-2xl' }" variant="soft">
      <div class="text-xs text-muted">
        {{ t('timeTracking.reports.kpiTotal') }}
      </div>
      <div class="text-2xl font-mono font-semibold mt-1">
        {{ totalLabel }}
      </div>
    </UCard>
    <UCard :ui="{ root: 'rounded-2xl' }" variant="soft">
      <div class="text-xs text-muted">
        {{ t('timeTracking.reports.kpiBillable') }}
      </div>
      <div class="text-2xl font-mono font-semibold mt-1">
        {{ billableLabel }}
      </div>
    </UCard>
    <UCard :ui="{ root: 'rounded-2xl' }" variant="soft">
      <div class="text-xs text-muted">
        {{ t('timeTracking.reports.kpiEntries') }}
      </div>
      <div class="text-2xl font-mono font-semibold mt-1">
        {{ summary?.entriesCount ?? 0 }}
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTimeReportsStore } from '@/stores/time-reports.store'
import { formatDuration } from '@/helpers/formatDuration'

const { t } = useI18n()
const store = useTimeReportsStore()
const { summary } = storeToRefs(store)

const totalLabel = computed(() => formatDuration(summary.value?.totalSeconds ?? 0))
const billableLabel = computed(() => formatDuration(summary.value?.totalBillableSeconds ?? 0))
</script>
