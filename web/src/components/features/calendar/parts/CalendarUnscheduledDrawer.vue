<template>
  <UDrawer
    v-model:open="open"
    :title="t('calendar.unscheduled.title')"
    :description="canEditTaskDeadline ? t('calendar.unscheduled.hintMobile') : undefined"
    :ui="{ body: 'flex min-h-0 flex-col gap-3' }"
    data-testid="calendar-unscheduled-drawer"
  >
    <template #body>
      <div class="flex items-center gap-2">
        <UInput
          v-model="calendarStore.unscheduledSearch"
          icon="i-lucide-search"
          :placeholder="t('calendar.unscheduled.search')"
          size="lg"
          class="min-w-0 flex-1"
        />
        <CalendarUnscheduledFilters size="md" />
      </div>

      <ul
        ref="list"
        class="flex max-h-[60dvh] flex-col gap-1.5 overflow-y-auto"
      >
        <li
          v-for="task in tasks"
          :key="task.id"
        >
          <CalendarSchedulePopover
            v-if="canEditTaskDeadline"
            :task="task"
            @open-task="showTask"
          />
          <button
            v-else
            type="button"
            class="block w-full text-left"
            @click="showTask(task.id)"
          >
            <CalendarTaskCard :task="task" />
          </button>
        </li>
        <li
          v-if="calendarStore.unscheduledLoading"
          class="flex justify-center py-2"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-4 animate-spin text-muted"
          />
        </li>
      </ul>

      <CalendarUnscheduledEmpty
        v-if="!calendarStore.unscheduledLoading && !tasks.length"
        :searching="narrowed"
        class="py-6"
      />
    </template>
  </UDrawer>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import CalendarTaskCard from '../CalendarTaskCard.vue'
import CalendarSchedulePopover from './CalendarSchedulePopover.vue'
import CalendarUnscheduledEmpty from './CalendarUnscheduledEmpty.vue'
import CalendarUnscheduledFilters from './CalendarUnscheduledFilters.vue'
import { useCalendarStore } from '@/stores/calendar.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useCalendarUnscheduledScroll, useCalendarUnscheduledTasks } from '@/composables/useCalendarUnscheduled'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const calendarStore = useCalendarStore()
const { canEditTaskDeadline } = useGoalPermissions()
const { openTask } = useTaskDetailPanel()
const { tasks, narrowed } = useCalendarUnscheduledTasks()
const list = useTemplateRef<HTMLElement>('list')
useCalendarUnscheduledScroll(list)

// The task opens over the calendar, so the drawer makes way
function showTask(taskId: number) {
  open.value = false
  openTask(taskId)
}
</script>
