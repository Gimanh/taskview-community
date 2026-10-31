<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
      <div
        v-for="item in counters"
        :key="item.key"
        class="flex justify-between gap-2"
      >
        <span class="text-muted">{{ t(`import.result.${item.key}`) }}</span>
        <span class="font-medium tabular-nums">{{ item.value }}</span>
      </div>
    </div>

    <UAlert
      v-if="stats.warnings.length > 0"
      color="warning"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="t('import.result.warningsTitle', { count: stats.warnings.length })"
    >
      <template #description>
        <ul class="list-disc ps-4 space-y-0.5 max-h-48 overflow-y-auto">
          <li
            v-for="(warning, index) in stats.warnings"
            :key="index"
          >
            {{ t(`import.warnings.${warning.code}`) }}<template v-if="warning.subject">
              — {{ warning.subject }}
            </template>
          </li>
        </ul>
        <p
          v-if="stats.warningsTruncated"
          class="mt-1"
        >
          {{ t('import.result.warningsTruncated') }}
        </p>
      </template>
    </UAlert>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportJobStats } from 'taskview-api'

const props = defineProps<{
  stats: ImportJobStats
}>()

const { t } = useI18n()

const counters = computed(() => [
  { key: 'tasksCreated', value: props.stats.tasksCreated },
  { key: 'statusesCreated', value: props.stats.statusesCreated },
  { key: 'listsCreated', value: props.stats.listsCreated },
  { key: 'tagsCreated', value: props.stats.tagsCreated },
  { key: 'membersAdded', value: props.stats.membersAdded },
  { key: 'attachmentsUploaded', value: props.stats.attachmentsUploaded },
])
</script>
