<template>
  <TaskCalendar
    ref="calendar"
    :tasks="tasks"
    :loading="store.loading"
    :can-create="canCreate"
    :can-edit-task="canEditTask"
    :hide-weekends="filters.hideWeekends.value"
    :collapse-empty-weekends="false"
    :save-dates="store.updateTask"
    :can-complete-task="canCompleteTask"
    :save-complete="saveComplete"
    :task-project="taskProject"
    :droppable="canPlan"
    :side-open="panelShown"
    class="h-full"
    @range="loadRange"
    @add="openAdd"
    @drop="onDrop"
    @drag-start="onEventDragStart"
    @drag-stop="onEventDragStop"
  >
    <template #actions>
      <UButton
        icon="i-lucide-inbox"
        :color="panelShown ? 'primary' : 'neutral'"
        :variant="panelShown ? 'soft' : 'ghost'"
        :size="isMobile ? 'md' : 'lg'"
        class="shrink-0"
        square
        :aria-label="t('calendar.unscheduled.toggle')"
        :title="t('calendar.unscheduled.toggle')"
        :aria-pressed="panelShown"
        data-testid="calendar-unscheduled-toggle"
        @click="toggleUnscheduled"
      />
    </template>

    <template #side>
      <div
        ref="panel"
        class="flex w-full"
      >
        <MainCalendarUnscheduled
          :drawer="false"
          :drop-target="draggingFromCalendar"
          @close="panelOpen = false"
        />
      </div>
    </template>
  </TaskCalendar>

  <MainCalendarUnscheduled
    v-if="isMobile"
    v-model:drawer-open="drawerOpen"
    drawer
    :drop-target="false"
  />

  <MainScreenAddTaskDialog
    v-model="addOpen"
    :span="addSpan ?? undefined"
    @added="store.refresh()"
  />
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { addDays, format } from 'date-fns'
import { useI18n } from 'vue-i18n'
import TaskCalendar from '@/components/features/calendar/TaskCalendar.vue'
import type { TaskCalendarRange, TaskCompleteArgs } from '@/components/features/calendar/TaskCalendar.types'
import MainScreenAddTaskDialog from '@/components/features/main/screen-main/parts/MainScreenAddTaskDialog.vue'
import MainCalendarUnscheduled from './MainCalendarUnscheduled.vue'
import { useCalendarStore } from '@/stores/calendar.store'
import { useTaskView } from '@/composables/useTaskView'
import { useCalendarUnscheduledDrop } from '@/composables/useCalendarUnscheduled'
import { isScheduled } from '@/helpers/taskCalendarDates'
import { useMainCalendarStore } from '@/stores/mainCalendar.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useInbox } from '@/composables/useInbox'
import { goalHasPermission } from '@/composables/useGoalPermissions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useCalendarUnscheduledPanel, useMainCalendarFilters, useMainCalendarPlanProject } from '@/composables/useCalendarRouteState'
import { projectColor } from '@/helpers/color'
import type { CalendarSpan } from '@/helpers/taskCalendarDates'
import type { TaskItem } from '@/types/tasks.types'

const DAY_FORMAT = 'yyyy-MM-dd'

const { t } = useI18n()
const store = useMainCalendarStore()
const goalsStore = useGoalsStore()
const orgStore = useOrganizationStore()
const { isOwnInbox } = useInbox()
const { isOpen: isTaskOpen } = useTaskDetailPanel()
const filters = useMainCalendarFilters()

const tasks = computed(() => store.tasks.filter(filters.matches))

// A task added from a day gets that date, so the project must allow both
const canCreate = computed(() => goalsStore.goals.some((goal) => !goal.archive
  && goalHasPermission(goal, 'COMPONENT_CAN_ADD_TASKS')
  && goalHasPermission(goal, 'TASK_CAN_EDIT_DEADLINE')))

function canEditTask(task: TaskItem): boolean {
  return goalHasPermission(goalsStore.goalMap.get(task.goalId), 'TASK_CAN_EDIT_DEADLINE')
}

function canCompleteTask(task: TaskItem): boolean {
  return goalHasPermission(goalsStore.goalMap.get(task.goalId), 'TASK_CAN_EDIT_STATUS')
}

// Completing a repeating task makes its next occurrence on the server: load it into the calendar
async function saveComplete({ task, complete }: TaskCompleteArgs): Promise<boolean> {
  const saved = await store.updateTask({ id: task.id, complete })
  if (saved && complete && task.recurrenceRuleId) store.refresh()
  return saved
}

function taskProject(task: TaskItem) {
  const goal = goalsStore.goalMap.get(task.goalId)
  if (!goal) return null
  return isOwnInbox(goal)
    ? { name: t('projects.inbox'), color: null }
    : { name: goal.name, color: projectColor(goal) }
}

// One day wider on each side: a task with a time is stored in UTC and can fall on a neighbouring local day
const range = ref<TaskCalendarRange>()

function loadRange(value: TaskCalendarRange) {
  range.value = value
}

watch([range, () => orgStore.currentOrg?.id], ([value]) => {
  if (!value) return
  store.fetchTasks({ from: format(addDays(value.start, -1), DAY_FORMAT), to: format(value.end, DAY_FORMAT) })
})

// The task card may change dates, the project or anything else shown here
watch(isTaskOpen, (open) => {
  if (!open) store.refresh()
})

// Undated tasks of one picked project wait in a panel (a drawer on phones) to be dragged onto a day
const calendarStore = useCalendarStore()
const { isMobile } = useTaskView()
const planProject = useMainCalendarPlanProject()
const panelOpen = useCalendarUnscheduledPanel()
const drawerOpen = ref(false)
const panelShown = computed(() => !isMobile.value && panelOpen.value)
const panelRef = useTemplateRef<HTMLElement>('panel')

const canPlan = computed(() => goalHasPermission(goalsStore.goalMap.get(planProject.value ?? 0), 'TASK_CAN_EDIT_DEADLINE'))

// Only a task of the panel's project may go back into it
const { draggingFromCalendar, onDrop, onEventDragStart, onEventDragStop } = useCalendarUnscheduledDrop({
  panel: () => panelRef.value,
  accepts: (task) => canPlan.value && task.goalId === planProject.value,
})

function toggleUnscheduled() {
  if (isMobile.value) drawerOpen.value = true
  else panelOpen.value = !panelOpen.value
}

// The panel saves through the project calendar's store: a task it dates or undates shows up here after a reload,
// and one undated from this calendar joins the panel's list
calendarStore.$onAction(({ name, after }) => {
  if (name !== 'updateTask') return
  after((task) => {
    if (!task) return
    store.refresh()
    if (!isScheduled(task) && !calendarStore.unscheduled.some((item) => item.id === task.id)) calendarStore.reloadUnscheduled()
  })
})

const calendarRef = useTemplateRef<InstanceType<typeof TaskCalendar>>('calendar')
const addOpen = ref(false)
const addSpan = ref<CalendarSpan | null>(null)

watch(addOpen, (open) => {
  if (!open) calendarRef.value?.unselect()
})

function openAdd(span: CalendarSpan) {
  addSpan.value = span
  addOpen.value = true
}
</script>
