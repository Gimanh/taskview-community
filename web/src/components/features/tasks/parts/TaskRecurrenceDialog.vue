<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('recurrence.title')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <TaskRecurrenceForm
          v-model="form"
          :dtstart="dtstart.date"
        />

        <div
          v-if="rule"
          class="flex flex-wrap gap-2 justify-end"
        >
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
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2 w-full">
        <UButton
          v-if="rule"
          :label="t('recurrence.deleteSeries')"
          icon="i-lucide-trash-2"
          color="error"
          variant="outline"
          :loading="actionLoading === 'delete'"
          @click="removeSeries"
        />
        <div class="flex items-center justify-end gap-2 w-full">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="soft"
            @click="open = false"
          />
          <UButton
            :label="t('common.save')"
            class="ml-auto"
            :loading="actionLoading === 'save'"
            @click="save"
          />
        </div>
        
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RecurrenceRule, Task } from 'taskview-api'
import TaskRecurrenceForm from './TaskRecurrenceForm.vue'
import { buildDtstartIso, buildRruleString, defaultRecurrenceForm, dtstartForTask, parseRruleToForm, parseRuleDtstart } from '@/helpers/recurrence'
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

const { canDeleteTask } = useGoalPermissions()
const tasksStore = useTasksStore()

const actionLoading = ref<DialogAction>(null)

const dtstart = computed(() => {
  if (props.rule) {
    return { date: parseRuleDtstart(props.rule.dtstart), iso: props.rule.dtstart }
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
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    
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
