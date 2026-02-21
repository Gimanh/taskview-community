<template>
  <MainScreenWidgetTemplate
    gradient-from="#4f46e5"
    gradient-to="#7c3aed"
    widget-type="lastAdded"
  >
    <template #title>
      <div>
        {{ t('msg.lastTasks') }}
      </div>
    </template>
    <template #actions>
      <MainScreenAddTaskDialog
        v-model="addTaskDialogModel"
        :title="t('msg.addTask')"
        :disabled="!hasActiveGoals"
        :no-dates="true"
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
    <template
      v-if="baseScreenStore.activeWidgetInMobile === 'lastAdded' || baseScreenStore.activeWidgetInMobile === 'all'"
      #content
    >
      <UTabs
        v-model="activeBasicTab"
        :items="tabs"
        variant="pill"
        size="xl"
        class="w-full"
        :ui="{list: 'rounded-none'}"
      >
        <template #lastAdded>
          <div
            v-if="baseScreenStore.tasks.length === 0"
            :class="noTasksClass"
          >
            <div class="p-5">
              {{ t('msg.noTasks') }}
            </div>

            <div
              class="p-5"
            >
              <div class="text-center bg-elevated px-5 py-2 rounded-lg shadow-md opacity-50 text-sm font-normal">
                {{ t('msg.lastAddedTasksExplanation') }}
              </div>
            </div>
            <div class="grow" />
            <NoGoals />
          </div>
          <div
            v-else
            v-bind="scrollContainerData"
          >
            <TaskItem
              v-for="task in baseScreenStore.tasks"
              :key="task.id"
              :task="task"
              @toggle="(t) => updateTaskStatus({ status: !t.complete, taskId: t.id }, 'tasks')"
            />
          </div>
        </template>
        <template #lastCompleted>
          <div
            v-if="baseScreenStore.tasksLastCompleted.length === 0"
            :class="noTasksClass"
          >
            {{ t('msg.noTasks') }}
            <div
              class="p-5"
            >
              <div class="text-center bg-elevated px-5 py-2 rounded-lg shadow-md opacity-50 text-sm font-normal">
                {{ t('msg.lastCompletedTasksExplanation') }}
              </div>
            </div>
            <div class="grow" />
            <NoGoals />
          </div>
          <div
            v-else
            v-bind="scrollContainerData"
          >
            <TaskItem
              v-for="task in baseScreenStore.tasksLastCompleted"
              :key="task.id"
              :task="task"
              @toggle="(t) => updateTaskStatus({ status: !t.complete, taskId: t.id }, 'tasksLastCompleted')"
            />
          </div>
        </template>
      </UTabs>
    </template>
  </MainScreenWidgetTemplate>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TabsItem } from '@nuxt/ui'
import { useDebounceFn } from '@vueuse/core'
import MainScreenAddTaskDialog from './MainScreenAddTaskDialog.vue'
import TaskItem from '@/components/features/tasks/parts/TaskItem.vue'
import { useWidgetScrollContainer } from '@/components/features/main/screen-main/useWidgetScrollContainer'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useTaskView } from '@/composables/useTaskView'
import type { TaskItem as TaskItemType } from '@/types/tasks.types'
import MainScreenWidgetTemplate from './MainScreenWidgetTemplate.vue'
import NoGoals from './NoGoals.vue'

const { t } = useI18n()
const baseScreenStore = useBaseScreenStore()
const activeBasicTab = ref('lastAdded')
const addTaskDialogModel = ref(false)
const scrollContainerData = useWidgetScrollContainer()
const { hasActiveGoals } = useTaskView()


const noTasksClass = 'min-h-24 flex flex-col items-center justify-center font-bold gap-2 h-full'

const tabs = computed<TabsItem[]>(() => [
  { label: t('msg.lastAddedTasks'), value: 'lastAdded', badge: baseScreenStore.tasks.length.toString(), slot: 'lastAdded' },
  {
    label: t('msg.lastCompletedTasks'),
    value: 'lastCompleted',
    badge: baseScreenStore.tasksLastCompleted.length.toString(),
    slot: 'lastCompleted',
  },
])

const updateTaskStatus = useDebounceFn(
  (data: { status: boolean; taskId: TaskItemType['id'] }, param: 'tasks' | 'tasksLastCompleted') => {
    baseScreenStore.updateTaskStatusNew(data, param)
  },
  500,
)
</script>
