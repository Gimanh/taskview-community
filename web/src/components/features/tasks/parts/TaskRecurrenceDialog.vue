<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ t('recurrence.title') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <TaskRecurrenceForm
          v-model="form"
          :dtstart="dtstart.date"
        />

        <template #footer>
          <div class="flex flex-wrap items-center gap-2">
            <template v-if="rule">
              <UButton
                v-if="canDeleteTask"
                :label="t('recurrence.skip')"
                icon="i-lucide-skip-forward"
                color="neutral"
                variant="outline"
                :loading="actionLoading === 'skip'"
                :disabled="rule.state !== 'active'"
                @click="skip"
              />
              <UButton
                :label="rule.state === 'paused' ? t('recurrence.resume') : t('recurrence.pause')"
                :icon="rule.state === 'paused' ? 'i-lucide-play' : 'i-lucide-pause'"
                color="neutral"
                variant="outline"
                :loading="actionLoading === 'pause'"
                @click="togglePause"
              />
              <UButton
                :label="t('recurrence.deleteSeries')"
                icon="i-lucide-trash-2"
                color="error"
                variant="outline"
                :loading="actionLoading === 'delete'"
                @click="removeSeries"
              />
            </template>
            <UButton
              :label="t('common.save')"
              class="ml-auto"
              :loading="actionLoading === 'save'"
              @click="save"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RecurrenceRule, Task } from 'taskview-api'
import TaskRecurrenceForm from './TaskRecurrenceForm.vue'
import { buildDtstartIso, buildRruleString, defaultRecurrenceForm, dtstartForTask, parseRruleToForm } from '@/helpers/recurrence'
import { useTaskView } from '@/composables/useTaskView'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTasksStore } from '@/stores/tasks.store'
import type { RecurrenceFormValue } from '@/types/recurrence.types'

type DialogAction = 'save' | 'skip' | 'pause' | 'delete' | null

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  task: Task
  rule: RecurrenceRule | null
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
// Skip deletes the open instance, so the server requires TASK_CAN_DELETE for it.
const { canDeleteTask } = useGoalPermissions()
const tasksStore = useTasksStore()

const actionLoading = ref<DialogAction>(null)

const dtstart = computed(() => {
  if (props.rule) {
    return { date: new Date(`${props.rule.dtstart.replace(' ', 'T')}Z`), iso: props.rule.dtstart }
  }
  return dtstartForTask({ startDate: props.task.startDate, startTime: props.task.startTime })
})

function initialForm(): RecurrenceFormValue {
  if (props.rule) {
    return parseRruleToForm({
      rrule: props.rule.rrule,
      dtstart: dtstart.value.date,
      notifyOnOccurrence: props.rule.notifyOnOccurrence,
      hasTime: props.rule.hasTime,
    })
  }
  return defaultRecurrenceForm(dtstart.value.date, !!props.task.startTime)
}

const form = ref<RecurrenceFormValue>(initialForm())

watch(open, (value) => {
  if (value) form.value = initialForm()
})

async function save() {
  actionLoading.value = 'save'
  try {
    const rrule = buildRruleString({ form: form.value, dtstart: dtstart.value.date })
    // Always send the current browser timezone: the series is anchored to the
    // user's wall clock, so editing a rule after relocation re-anchors it
    // ("9:00" stays 9:00 wherever the user lives now).
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    // The form's time (incl. 00:00, or none) drives the dtstart anchor; the
    // start day stays whatever the series was anchored to.
    const dtstartIso = buildDtstartIso({ dateStr: dtstart.value.iso.slice(0, 10), time: form.value.time })
    const result = props.rule
      ? await tasksStore.updateRecurrence({
        ruleId: props.rule.id,
        rrule,
        dtstart: dtstartIso,
        timezone,
        notifyOnOccurrence: form.value.notifyOnOccurrence,
      })
      : await tasksStore.createRecurrence({
        taskId: props.task.id,
        rrule,
        dtstart: dtstartIso,
        timezone,
        notifyOnOccurrence: form.value.notifyOnOccurrence,
      })

    if (result) {
      toast.add({ title: t('recurrence.toasts.saved'), color: 'success' })
      emit('changed')
      open.value = false
    }
  } finally {
    actionLoading.value = null
  }
}

async function skip() {
  if (!props.rule) return
  actionLoading.value = 'skip'
  const details = await tasksStore.skipRecurrence({ ruleId: props.rule.id, taskId: props.task.id })
  actionLoading.value = null
  if (details) {
    toast.add({ title: t('recurrence.toasts.skipped'), color: 'success' })
    emit('changed')
    open.value = false
  }
}

async function togglePause() {
  if (!props.rule) return
  actionLoading.value = 'pause'
  const result = props.rule.state === 'paused'
    ? await tasksStore.resumeRecurrence(props.rule.id)
    : await tasksStore.pauseRecurrence(props.rule.id)
  actionLoading.value = null
  if (result) emit('changed')
}

async function removeSeries() {
  if (!props.rule) return
  actionLoading.value = 'delete'
  const deleted = await tasksStore.deleteRecurrence({ ruleId: props.rule.id, taskId: props.task.id })
  actionLoading.value = null
  if (deleted) {
    toast.add({ title: t('recurrence.toasts.deleted'), color: 'success' })
    emit('changed')
    open.value = false
  }
}
</script>
