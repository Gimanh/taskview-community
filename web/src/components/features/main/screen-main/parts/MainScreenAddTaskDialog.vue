<template>
  <UModal
    v-model:open="model"
    :fullscreen="isMobile"
    :content="{ onOpenAutoFocus: focusDescription }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">
          {{ title }}
        </h3>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="close"
        />
      </div>
    </template>
        
    <template #body>
      <!-- <UCard> -->
      <div class="flex flex-col gap-4">
        <UFormField :label="t('tasks.description')">
          <UInput
            ref="descriptionInput"
            v-model="taskDescription"
            :placeholder="t('tasks.addPlaceholder')"
            class="w-full"
            data-testid="main-add-task-input"
            @keyup.enter="addTask"
          />
        </UFormField>

        <UFormField :label="t('projects.project')">
          <USelectMenu
            v-model="selectedGoalId"
            :items="goalOptions"
            :placeholder="t('projects.selectProject')"
            :search-input="false"
            size="xl"
            value-key="value"
            option-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="!noDates"
          :label="t('tasks.deadline')"
        >
          <UPopover>
            <UButton
              :label="formattedDeadline || t('tasks.addDueDate')"
              icon="i-lucide-calendar"
              color="neutral"
              variant="soft"
              class="w-full justify-start"
              :ui="{leadingIcon: 'size-4.5'}"
              data-testid="main-add-task-deadline"
            />
            <template #content>
              <UCalendar
                v-model="(deadline as any)"
                :week-starts-on="weekStart"
                class="p-2"
              />
            </template>
          </UPopover>
        </UFormField>
      </div>
      <!-- </UCard> -->
    </template>

    <template #default="slotProps">
      <slot
        name="activator"
        v-bind="slotProps"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="soft"
          @click="close"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          :disabled="!canAdd"
          :loading="loading"
          variant="soft"
          data-testid="main-add-task-submit"
          @click="addTask"
        >
          {{ t('tasks.add') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate } from '@internationalized/date'
import { useGoalsStore } from '@/stores/goals.store'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useKanbanStore } from '@/stores/kanban.store'
import { useGraphStore } from '@/stores/graph.store'
import { graphViewportCenter } from '@/components/features/graph/composables/useGraphViewportCenter'
import { $ls, $tvApi } from '@/plugins/axios'
import { useTaskView } from '@/composables/useTaskView'
import { useInbox } from '@/composables/useInbox'
import { useWeekStart } from '@/composables/useWeekStart'

const weekStart = useWeekStart()

const LAST_SELECTED_PROJECT_KEY = 'lastSelectedProjectId'

const props = withDefaults(defineProps<{
  title?: string
  disabled?: boolean
  upcomingTask?: boolean
  noDates?: boolean
  taskName?: string
  /** preselected instead of the last chosen project, e.g. the project on screen */
  defaultGoalId?: number
  /** list the task goes to while the default project stays selected */
  defaultListId?: number
  /** show the deadline field but leave it empty */
  emptyDeadline?: boolean
}>(), {
  title: '',
  disabled: false,
  upcomingTask: false,
  noDates: false,
  taskName: '',
  defaultGoalId: undefined,
  defaultListId: undefined,
  emptyDeadline: false,
})

const emit = defineEmits<{
  added: []
  close: []
}>()

const model = defineModel<boolean>({ default: false })

const { t } = useI18n()
const goalsStore = useGoalsStore()
const baseScreenStore = useBaseScreenStore()
const tasksStore = useTasksStore()
const kanbanStore = useKanbanStore()
const graphStore = useGraphStore()
const { isMobile } = useTaskView()
const { inbox, isOwnInbox } = useInbox()

const descriptionInput = useTemplateRef('descriptionInput')

// The dialog would focus its close button first; typing should go straight into the title.
// On a phone this would pop the keyboard over the form, so the default stays there
function focusDescription(event: Event) {
  const input = descriptionInput.value?.inputRef
  if (!input || isMobile.value) return
  event.preventDefault()
  input.focus()
}

const taskDescription = ref(props.taskName)
const selectedGoalId = ref<number | undefined>(undefined)
const deadline = ref<CalendarDate | null>(null)
const loading = ref(false)

watch(() => props.taskName, (newVal) => {
  taskDescription.value = newVal
})

watch(model, async (isOpen) => {
  if (isOpen) {
    // Set default deadline based on widget type
    if (!props.noDates && !props.emptyDeadline) {
      const today = new Date()
      if (props.upcomingTask) {
        today.setDate(today.getDate() + 1)
      }
      deadline.value = new CalendarDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate(),
      )
    }

    const defaultGoal = props.defaultGoalId
      ? goalsStore.goals.find(g => !g.archive && g.id === props.defaultGoalId)
      : undefined
    if (defaultGoal) {
      selectedGoalId.value = defaultGoal.id
      return
    }

    // Use the last chosen project (it may be the Inbox); otherwise default to the
    // Inbox — that's exactly what it's for.
    const saved = await $ls.getValue(LAST_SELECTED_PROJECT_KEY)
    const savedId = saved ? Number(saved) : undefined
    const savedGoal = savedId ? goalsStore.goals.find(g => !g.archive && g.id === savedId) : undefined

    selectedGoalId.value = savedGoal ? savedGoal.id : inbox.value?.id
  } else {
    // Reset form on close
    taskDescription.value = props.taskName
    selectedGoalId.value = undefined
    deadline.value = null
  }
})

const goalOptions = computed(() => {
  const active = goalsStore.goals.filter(g => !g.archive)
  const options = active
    .filter(g => !isOwnInbox(g))
    .map(g => ({ label: g.name, value: g.id }))
  if (inbox.value) {
    options.unshift({ label: t('projects.inbox'), value: inbox.value.id })
  }
  return options
})

const formattedDeadline = computed(() => {
  if (!deadline.value) return ''
  return `${deadline.value.day}.${String(deadline.value.month).padStart(2, '0')}.${deadline.value.year}`
})

const canAdd = computed(() =>
  taskDescription.value.trim() && selectedGoalId.value !== undefined,
)

async function addTask() {
  if (!canAdd.value || !selectedGoalId.value) return

  loading.value = true

  try {
    // Remember the chosen project for the next time the dialog is opened.
    await $ls.setValue(LAST_SELECTED_PROJECT_KEY, selectedGoalId.value.toString())

    const endDate = deadline.value
      ? `${deadline.value.year}-${String(deadline.value.month).padStart(2, '0')}-${String(deadline.value.day).padStart(2, '0')}`
      : null

    // A task for the project whose graph is on screen is placed in the visible part of it
    const nodeGraphPosition = selectedGoalId.value === graphStore.goalId ? graphViewportCenter() : null

    const task = await $tvApi.tasks.createTask({
      description: taskDescription.value.trim(),
      goalId: selectedGoalId.value,
      goalListId: selectedGoalId.value === props.defaultGoalId ? props.defaultListId ?? null : null,
      endDate,
      ...(nodeGraphPosition && { nodeGraphPosition }),
    })

    if (task) {
      baseScreenStore.addCreatedTask(task)
      // Show it right away in the project list, kanban or graph on screen; each skips a
      // task that does not belong to the current view or is already there
      tasksStore.applyRemoteTask({ task, created: true })
      kanbanStore.insertTask(task)
      if (nodeGraphPosition) graphStore.insertTask({ task })
      emit('added')
      close()
    }
  }
  finally {
    loading.value = false
  }
}

function close() {
  model.value = false
  emit('close')
}
</script>
