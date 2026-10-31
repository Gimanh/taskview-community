<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div
      v-for="item in items"
      :key="item.key"
      class="rounded-lg border border-default p-3"
    >
      <p class="text-xl font-semibold tabular-nums">
        {{ item.value }}
      </p>
      <p class="text-xs text-muted">
        {{ t(`import.summary.${item.key}`) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportProjectMeta } from 'taskview-api'

const props = defineProps<{
  meta: ImportProjectMeta
}>()

const { t, n } = useI18n()

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${n(Math.ceil(bytes / 1024))} KB`
  return `${n(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`
}

const items = computed(() => {
  const { taskCount, archivedTaskCount, attachmentCount, attachmentBytes } = props.meta
  return [
    { key: 'tasks', value: n(taskCount) },
    { key: 'archived', value: archivedTaskCount === null ? null : n(archivedTaskCount) },
    { key: 'attachments', value: attachmentCount === null ? null : n(attachmentCount) },
    { key: 'attachmentsSize', value: attachmentBytes === null ? null : formatBytes(attachmentBytes) },
  ].filter((item) => item.value !== null)
})
</script>
