<template>
  <div
    v-if="canViewTimeTracking || canLogTime"
    class="flex flex-col gap-3 rounded-2xl bg-accented/20 p-3.5"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-timer"
          class="size-4.5 text-muted"
        />
        <span class="text-[15px] font-semibold text-highlighted">{{ t('timeTracking.title') }}</span>
        <UBadge
          v-if="totalSeconds > 0"
          :label="formatDuration(totalSeconds)"
          color="neutral"
          variant="subtle"
          size="sm"
          :ui="{ base: 'rounded-full' }"
        />
      </div>

      <span
        v-if="isActiveOnThisTask"
        class="font-mono text-sm tabular-nums text-primary"
      >
        {{ elapsedFormatted }}
      </span>
    </div>

    <UButton
      v-if="canLogTime && !isActiveOnThisTask"
      :label="t('timeTracking.start')"
      icon="i-lucide-play"
      color="primary"
      variant="soft"
      size="lg"
      block
      :ui="{ base: 'rounded-xl justify-center' }"
      @click="onStart"
    />
    <UButton
      v-else-if="canLogTime"
      :label="t('timeTracking.stop')"
      icon="i-lucide-square"
      color="error"
      variant="soft"
      size="lg"
      block
      :ui="{ base: 'rounded-xl justify-center' }"
      @click="store.stop()"
    />

    <div
      v-if="canLogTime && otherActiveWarning"
      class="flex items-center gap-2 text-xs text-warning"
    >
      <UIcon
        name="i-lucide-alert-triangle"
        class="size-4 shrink-0"
      />
      <span>{{ t('timeTracking.willStopOther') }}</span>
    </div>

    <template v-if="canViewTimeTracking">
      <div
        v-if="entries.length > 0"
        class="flex flex-col gap-1 rounded-2xl bg-elevated p-2 max-h-80 overflow-y-auto"
      >
        <TaskTimeTrackingEntry
          v-for="entry in entries"
          :key="entry.id"
          :entry="entry"
          @delete="onDelete"
          @update="onUpdate"
        />
      </div>
      <div
        v-else
        class="flex flex-col items-center gap-2 rounded-2xl bg-elevated py-6 text-muted"
      >
        <UIcon
          name="i-lucide-inbox"
          class="size-6"
        />
        <span class="text-sm">{{ t('timeTracking.empty') }}</span>
      </div>
    </template>

    <div v-if="canLogTime">
      <UButton
        v-if="!manualOpen"
        :label="t('timeTracking.addManual')"
        icon="i-lucide-plus"
        color="neutral"
        variant="soft"
        size="lg"
        block
        :ui="{ base: 'rounded-xl justify-start' }"
        @click="manualOpen = true"
      />
      <TaskTimeTrackingForm
        v-else
        @submit="onSubmitManual"
        @cancel="manualOpen = false"
      />
    </div>

    <TaskTimeTrackingDeleteModal
      v-model:open="deleteModalOpen"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'
import { useTimeTrackingStore } from '@/stores/time-tracking.store'
import { useTimer } from '@/composables/useTimer'
import { formatDuration } from '@/helpers/formatDuration'
import TaskTimeTrackingEntry from './TaskTimeTrackingEntry.vue'
import TaskTimeTrackingForm, { type TimeEntryFormPayload } from './TaskTimeTrackingForm.vue'
import TaskTimeTrackingDeleteModal from './TaskTimeTrackingDeleteModal.vue'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const props = defineProps<{
  taskId: number
}>()

const { t } = useI18n()
const toast = useToast()
const store = useTimeTrackingStore()
const { canViewTimeTracking, canLogTime } = useGoalPermissions()
const { entriesByTask, active } = storeToRefs(store)
const { elapsedFormatted } = useTimer()

const manualOpen = ref(false)
const deleteModalOpen = ref(false)
const pendingDeleteId = ref<number | null>(null)

const entries = computed(() => entriesByTask.value[props.taskId] ?? [])
const totalSeconds = computed(() =>
  entries.value.reduce((sum, e) => sum + (e.durationSeconds ?? 0), 0),
)
const isActiveOnThisTask = computed(() => active.value?.taskId === props.taskId)
const otherActiveWarning = computed(
  () => active.value !== null && active.value.taskId !== props.taskId,
)

const onStart = async () => {
  const result = await store.start(props.taskId)
  if (result?.autoStoppedEntry) {
    toast.add({
      title: t('timeTracking.previousStopped'),
      description: t('timeTracking.previousStoppedDescription', {
        duration: formatDuration(result.autoStoppedEntry.durationSeconds ?? 0),
      }),
      color: 'warning',
    })
  }
}

const onDelete = (entryId: number) => {
  pendingDeleteId.value = entryId
  deleteModalOpen.value = true
}

const onConfirmDelete = () => {
  if (pendingDeleteId.value !== null) {
    store.deleteEntry(pendingDeleteId.value, props.taskId)
    pendingDeleteId.value = null
  }
}

const onUpdate = (payload: TimeEntryFormPayload & { id: number }) =>
  store.update({
    id: payload.id,
    startedAt: payload.startedAt,
    endedAt: payload.endedAt,
    description: payload.description || undefined,
    billable: payload.billable,
  })

const onSubmitManual = async (payload: TimeEntryFormPayload) => {
  const created = await store.createManual({
    taskId: props.taskId,
    startedAt: payload.startedAt,
    endedAt: payload.endedAt,
    description: payload.description || undefined,
    billable: payload.billable,
  })
  if (created) manualOpen.value = false
}

watch(
  () => props.taskId,
  (id) => {
    if (id && canViewTimeTracking.value) store.fetchEntriesForTask(id)
  },
  { immediate: true },
)

onMounted(() => {
  if (!active.value) store.fetchActive()
})

useEventListener(document, 'visibilitychange', () => {
  if (!document.hidden && props.taskId && canViewTimeTracking.value) {
    store.fetchEntriesForTask(props.taskId)
  }
})
</script>
