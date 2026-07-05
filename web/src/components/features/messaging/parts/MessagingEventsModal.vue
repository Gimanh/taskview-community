<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('messaging.eventsTitle') }}
      </h3>
    </template>

    <template #body>
      <p class="text-sm text-muted mb-4">
        {{ t('messaging.eventsDescription') }}
      </p>

      <div class="flex flex-col gap-5">
        <div
          v-for="group in visibleGroups"
          :key="group.key"
        >
          <p class="text-xs font-semibold text-muted uppercase mb-2">
            {{ t(`messaging.eventGroups.${group.key}`) }}
          </p>
          <div class="flex flex-col gap-2">
            <label
              v-for="event in group.events"
              :key="event"
              class="flex items-center gap-3 cursor-pointer"
            >
              <UCheckbox
                :model-value="selected.includes(event)"
                @update:model-value="toggle(event)"
              />
              <span class="text-sm">{{ eventLabel(event) }}</span>
            </label>
          </div>
        </div>

        <UButton
          v-if="!showAdvanced"
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-chevron-down"
          class="self-start"
          @click="showAdvanced = true"
        >
          {{ t('messaging.showMoreEvents') }}
          <span v-if="advancedSelectedCount">({{ advancedSelectedCount }})</span>
        </UButton>
        <UButton
          v-else
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-chevron-up"
          class="self-start"
          @click="showAdvanced = false"
        >
          {{ t('messaging.showLessEvents') }}
        </UButton>
      </div>
    </template>

    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          variant="ghost"
          color="neutral"
          @click="open = false"
        />
        <UButton
          :label="t('common.save')"
          color="primary"
          variant="soft"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{ events: string[] }>()
const emit = defineEmits<{ save: [events: string[]] }>()
const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { isMobile } = useTaskView()

// Task events are the common ones (shown always); the rest are "noise" hidden
// behind a "show more" toggle.
const GROUPS = [
  { key: 'tasks', advanced: false, events: ['task.created', 'task.assigned', 'task.statusChanged', 'task.completed', 'task.edited', 'task.addedToSprint', 'task.deleted'] },
  { key: 'sprints', advanced: true, events: ['sprint.created', 'sprint.updated', 'sprint.started', 'sprint.reviewStarted', 'sprint.completed', 'sprint.paused', 'sprint.resumed', 'sprint.deleted'] },
  { key: 'members', advanced: true, events: ['member.added', 'member.removed', 'member.rolesChanged'] },
  { key: 'time', advanced: true, events: ['time.started', 'time.stopped', 'time.logged', 'time.updated', 'time.deleted'] },
  { key: 'recurrence', advanced: true, events: ['recurrence.created', 'recurrence.updated', 'recurrence.paused', 'recurrence.resumed', 'recurrence.ended', 'recurrence.deleted', 'recurrence.skipped'] },
]

const LABEL_KEY: Record<string, string> = {
  'task.created': 'taskCreated',
  'task.assigned': 'taskAssigned',
  'task.statusChanged': 'taskStatusChanged',
  'task.completed': 'taskCompleted',
  'task.edited': 'taskEdited',
  'task.addedToSprint': 'taskAddedToSprint',
  'task.deleted': 'taskDeleted',
  'sprint.created': 'sprintCreated',
  'sprint.updated': 'sprintUpdated',
  'sprint.started': 'sprintStarted',
  'sprint.reviewStarted': 'sprintReviewStarted',
  'sprint.completed': 'sprintCompleted',
  'sprint.paused': 'sprintPaused',
  'sprint.resumed': 'sprintResumed',
  'sprint.deleted': 'sprintDeleted',
  'member.added': 'memberAdded',
  'member.removed': 'memberRemoved',
  'member.rolesChanged': 'memberRolesChanged',
  'time.started': 'timeStarted',
  'time.stopped': 'timeStopped',
  'time.logged': 'timeLogged',
  'time.updated': 'timeUpdated',
  'time.deleted': 'timeDeleted',
  'recurrence.created': 'recurrenceCreated',
  'recurrence.updated': 'recurrenceUpdated',
  'recurrence.paused': 'recurrencePaused',
  'recurrence.resumed': 'recurrenceResumed',
  'recurrence.ended': 'recurrenceEnded',
  'recurrence.deleted': 'recurrenceDeleted',
  'recurrence.skipped': 'recurrenceSkipped',
}

const selected = ref<string[]>([])
const saving = ref(false)
const showAdvanced = ref(false)

const advancedEvents = GROUPS.filter((g) => g.advanced).flatMap((g) => g.events)
const advancedSelectedCount = computed(() => selected.value.filter((e) => advancedEvents.includes(e)).length)
const visibleGroups = computed(() => (showAdvanced.value ? GROUPS : GROUPS.filter((g) => !g.advanced)))

watch(open, (isOpen) => {
  if (isOpen) {
    selected.value = [...props.events]
    // Auto-expand if the connection already subscribes to advanced events.
    showAdvanced.value = advancedSelectedCount.value > 0
  }
})

function eventLabel(event: string): string {
  return t(`messaging.eventLabels.${LABEL_KEY[event] ?? event}`)
}

function toggle(event: string) {
  selected.value = selected.value.includes(event)
    ? selected.value.filter((e) => e !== event)
    : [...selected.value, event]
}

function save() {
  emit('save', [...selected.value])
  open.value = false
}
</script>
