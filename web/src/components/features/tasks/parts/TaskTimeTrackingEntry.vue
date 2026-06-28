<template>
  <div class="flex flex-col gap-1 px-3 py-2 rounded-xl bg-default shadow-xs text-sm">
    <div class="flex lg:items-center flex-col lg:flex-row justify-between gap-2">
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span class="font-mono">{{ formattedStarted }}</span>
          <span class="truncate">· {{ userLabel }}</span>
        </div>
        <span
          v-if="entry.description"
          class="truncate"
        >{{ entry.description }}</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <UBadge
          v-if="entry.endedAt"
          :label="formatDuration(entry.durationSeconds ?? 0)"
          color="neutral"
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-else
          :label="t('timeTracking.running')"
          color="primary"
          variant="subtle"
          size="xs"
        />
        <div class="w-full flex justify-end gap-2">
          <UButton
            v-if="entry.endedAt && !editing && canEdit"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="editing = true"
          />
          <UButton
            v-if="entry.endedAt && !editing && canEdit"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            @click="emit('delete', entry.id)"
          />
        </div>
      </div>
    </div>

    <TaskTimeTrackingForm
      v-if="editing"
      :initial-started-at="entry.startedAt"
      :initial-ended-at="entry.endedAt ?? undefined"
      :initial-description="entry.description ?? ''"
      :initial-billable="entry.billable"
      class="border-t border-default"
      @submit="onSubmit"
      @cancel="editing = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TimeEntryItem } from 'taskview-api'
import { formatDuration } from '@/helpers/formatDuration'
import TaskTimeTrackingForm, { type TimeEntryFormPayload } from './TaskTimeTrackingForm.vue'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useUserStore } from '@/stores/user.store'

const props = defineProps<{
  entry: TimeEntryItem
}>()

const emit = defineEmits<{
  delete: [entryId: number]
  update: [payload: TimeEntryFormPayload & { id: number }]
}>()

const { t } = useI18n()
const editing = ref(false)
const userStore = useUserStore()
const { canManageAllTime } = useGoalPermissions()

const isOwn = computed(() => userStore.payloadData?.id === props.entry.userId)
const canEdit = computed(() => canManageAllTime.value)

const formattedStarted = computed(() => new Date(props.entry.startedAt).toLocaleString())
const userLabel = computed(() =>
  isOwn.value ? t('timeTracking.you') : (props.entry.userEmail ?? t('timeTracking.unknownUser')),
)

const onSubmit = (payload: TimeEntryFormPayload) => {
  emit('update', { id: props.entry.id, ...payload })
  editing.value = false
}
</script>
