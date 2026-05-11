<template>
  <UTooltip
    v-if="active"
    :text="tooltipText"
  >
    <button
      type="button"
      class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      @click="goToTask"
    >
      <span class="relative flex size-2">
        <span class="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
        <span class="relative inline-flex rounded-full size-2 bg-primary" />
      </span>
      <span class="font-mono text-xs tabular-nums">{{ elapsedFormatted }}</span>
      <UIcon
        name="i-lucide-square"
        class="size-3.5 cursor-pointer hover:opacity-80"
        @click.stop="onStop"
      />
    </button>
  </UTooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTimer } from '@/composables/useTimer'
import { useTimeTrackingStore } from '@/stores/time-tracking.store'
import { useOrganizationStore } from '@/stores/organization.store'

const router = useRouter()
const { t } = useI18n()
const store = useTimeTrackingStore()
const orgStore = useOrganizationStore()
const { active, elapsedFormatted } = useTimer()

const tooltipText = computed(() => t('timeTracking.activeTimerTooltip'))

const goToTask = () => {
  if (!active.value) return
  router.push({
    name: 'user',
    params: {
      orgSlug: orgStore.currentOrgSlug,
      projectId: String(active.value.goalId),
      taskId: String(active.value.taskId),
    },
  })
}

const onStop = async () => {
  await store.stop()
}
</script>
