<template>
  <div
    v-if="usage"
    class="flex flex-col gap-1.5"
    data-testid="files-quota-usage"
  >
    <div class="flex items-center justify-between text-xs text-muted">
      <span>{{ t('files.quota.usage', { used: formatBytes(usage.used), total: formatBytes(usage.total) }) }}</span>
      <span>{{ usage.percent }}%</span>
    </div>
    <UProgress
      :model-value="usage.percent"
      size="xs"
      :color="usage.percent >= 90 ? 'error' : usage.percent >= 75 ? 'warning' : 'primary'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFilesStore } from '@/stores/files.store'
import { useFileKind } from '@/composables/useFileKind'

const props = defineProps<{
  goalId: number
}>()

const { t } = useI18n()
const { formatBytes } = useFileKind()
const filesStore = useFilesStore()

const usage = computed(() => {
  const quota = filesStore.quotaByGoal[props.goalId]
  if (!quota || quota.mode !== 'enforce' || quota.quotaBytes === null || quota.usedBytes === null) return null
  const percent = quota.quotaBytes > 0 ? Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100)) : 100
  return { used: quota.usedBytes, total: quota.quotaBytes, percent }
})
</script>
