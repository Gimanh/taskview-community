<template>
  <div class="flex flex-col gap-1">
    <h3 class="text-sm font-medium">
      {{ t('timeTracking.reports.recentEntries') }}
    </h3>
    <div
      v-if="entries.length === 0"
      class="text-xs text-muted py-3 text-center"
    >
      {{ t('timeTracking.reports.empty') }}
    </div>
    <div
      v-else
      class="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1"
    >
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-elevated/50 text-sm"
      >
        <div class="flex flex-col min-w-0 flex-1">
          <div class="flex items-center gap-2 text-xs text-muted">
            <span class="font-mono">{{ formatDate(entry.startedAt) }}</span>
            <span class="truncate">· {{ entry.userEmail ?? `#${entry.userId}` }}</span>
          </div>
          <span
            v-if="entry.description"
            class="truncate"
          >{{ entry.description }}</span>
        </div>
        <UBadge
          :label="formatDuration(entry.durationSeconds ?? 0)"
          color="neutral"
          variant="subtle"
          size="xs"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTimeReportsStore } from '@/stores/time-reports.store'
import { formatDuration } from '@/helpers/formatDuration'

const { t } = useI18n()
const store = useTimeReportsStore()
const { entries } = storeToRefs(store)

const formatDate = (iso: string) => new Date(iso).toLocaleString()
</script>
