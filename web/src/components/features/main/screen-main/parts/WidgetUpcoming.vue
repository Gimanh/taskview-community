<template>
  <WidgetBase
    :completed-tasks="tasksCompleted"
    :not-completed-tasks="tasksNotCompleted"
    :title="t('msg.upcomingTasks')"
    :explanation="t('msg.upcomingExplanation')"
    :motivation="motivation"
    gradient-from="#8b5cf6"
    gradient-to="#d946ef"
    widget-type="upcoming"
    @update:task-status="updateTaskStatus"
  >
    <template #actions>
      <MainScreenAddTaskDialog
        v-model="addUpcomingTaskDialogModel"
        :title="t('msg.addTaskToUpcoming')"
        :disabled="!hasActiveGoals"
        upcoming-task
      >
        <template #activator="props">
          <UButton
            v-bind="props"
            icon="i-lucide-plus"
            :disabled="!hasActiveGoals"
            variant="soft"
            size="lg"
            class="rounded-full"
          />
        </template>
      </MainScreenAddTaskDialog>
    </template>
  </WidgetBase>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import MainScreenAddTaskDialog from './MainScreenAddTaskDialog.vue'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useTaskView } from '@/composables/useTaskView'
import type { TaskItem } from '@/types/tasks.types'
import WidgetBase from './WidgetBase.vue'

const { tm, t } = useI18n()
const baseScreenStore = useBaseScreenStore()
const addUpcomingTaskDialogModel = ref(false)
const { hasActiveGoals } = useTaskView()

const motivation = computed(
  () => tm('motivationUpcoming')[Math.floor(Math.random() * tm('motivationUpcoming').length)],
)

const tasksNotCompleted = computed(() => baseScreenStore.tasksUpcoming.filter((task) => !task.complete))
const tasksCompleted = computed(() => baseScreenStore.tasksUpcoming.filter((task) => task.complete))

const updateTaskStatus = useDebounceFn((data: { status: boolean; taskId: TaskItem['id'] }) => {
  baseScreenStore.updateTaskStatusNew(data, 'tasksUpcoming')
}, 500)
</script>
