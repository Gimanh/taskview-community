<template>
  <WidgetBase
    :completed-tasks="tasksCompleted"
    :not-completed-tasks="tasksNotCompleted"
    :title="t('msg.todayTasks')"
    :date-color="dateColor"
    :explanation="t('msg.todayExplanation')"
    :motivation="motivation"
    gradient-from="#4f46e5"
    gradient-to="#7c3aed"
    widget-type="today"
    @update:task-status="updateTaskStatus"
  >
    <template #actions>
      <MainScreenAddTaskDialog
        v-model="addTaskDialogModel"
        :title="t('msg.addTaskToToday')"
        :disabled="!hasActiveGoals"
      >
        <template #activator="props">
          <UButton
            v-bind="props"
            icon="i-lucide-plus"
            :disabled="!hasActiveGoals"
            variant="soft"
            size="lg"
            class="rounded-full"
            @click.stop
          />
        </template>
      </MainScreenAddTaskDialog>
    </template>
  </WidgetBase>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MainScreenAddTaskDialog from './MainScreenAddTaskDialog.vue'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useTaskView } from '@/composables/useTaskView'
import type { TaskItem } from '@/types/tasks.types'
import WidgetBase from './WidgetBase.vue'

const { tm, t } = useI18n()

const baseScreenStore = useBaseScreenStore()
const addTaskDialogModel = ref(false)
const { hasActiveGoals } = useTaskView()

const motivation = computed(() => tm('motivationToday')[Math.floor(Math.random() * tm('motivationToday').length)])

const tasksNotCompleted = computed(() => baseScreenStore.tasksToday.filter((task) => !task.complete))
const tasksCompleted = computed(() => baseScreenStore.tasksToday.filter((task) => task.complete))

const updateTaskStatus = (data: { status: boolean; taskId: TaskItem['id'] }) => {
  baseScreenStore.updateTaskStatusNew(data, 'tasksToday')
}

const dateColor = (date: string) => {
  return date !== t('msg.today')
}
</script>
