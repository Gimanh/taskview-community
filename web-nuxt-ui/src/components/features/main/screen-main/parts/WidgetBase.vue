<template>
  <MainScreenWidgetTemplate
    :gradient-from="props.gradientFrom"
    :gradient-to="props.gradientTo"
    :widget-type="props.widgetType"
  >
    <template #title>
      <div>
        {{ props.title }}
      </div>
    </template>
    <template #actions>
      <slot name="actions" />
    </template>
    <template
      v-if="props.widgetType === baseScreenStore.activeWidgetInMobile || baseScreenStore.activeWidgetInMobile === 'all'"
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
        <template #pending>
          <div
            v-if="props.notCompletedTasks.length === 0"
            :class="noTasksClass"
          >
            <div class="text-xl text-muted p-5 text-center mt-5">
              {{ props.motivation }}
            </div>

            <div
              v-if="props.explanation"
              class="p-5"
            >
              <div class="text-center bg-elevated px-5 py-2 rounded-lg shadow-md opacity-50 text-sm font-normal">
                {{ props.explanation }}
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
              v-for="task in props.notCompletedTasks"
              :key="task.id"
              :task="task"
              @toggle="handleTaskToggle"
            />
          </div>
        </template>
        <template #completed>
          <div
            v-if="props.completedTasks.length === 0"
            :class="noTasksClass"
          >
            <div class="p-5 opacity-50">
              {{ t('msg.noTasks') }}
            </div>
            <NoGoals />
          </div>
          <div
            v-else
            v-bind="scrollContainerData"
          >
            <TaskItem
              v-for="task in props.completedTasks"
              :key="task.id"
              :task="task"
              @toggle="handleTaskToggle"
            />
          </div>
        </template>
      </UTabs>
    </template>
  </MainScreenWidgetTemplate>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'
import type { Task } from 'taskview-api'
import TaskItem from '@/components/features/tasks/parts/TaskItem.vue'
import { useWidgetScrollContainer } from '@/components/features/main/screen-main/useWidgetScrollContainer'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import type { TaskItem as TaskItemType } from '@/types/tasks.types'
import MainScreenWidgetTemplate from './MainScreenWidgetTemplate.vue'
import NoGoals from './NoGoals.vue'

const props = defineProps<{
  title: string
  completedTasks: TaskItemType[]
  notCompletedTasks: TaskItemType[]
  gradientFrom: string
  gradientTo: string
  explanation?: string
  dateColor?: (date: string) => boolean
  motivation?: string
  widgetType: 'today' | 'lastAdded' | 'upcoming'
}>()

const emit = defineEmits<(e: 'update:task-status', data: { status: boolean; taskId: TaskItemType['id'] }) => void>()

const { t } = useI18n()

const scrollContainerData = useWidgetScrollContainer()
const baseScreenStore = useBaseScreenStore()

const activeBasicTab = ref('pending')

const noTasksClass = 'min-h-24 flex flex-col items-center justify-center font-bold gap-2 h-full'

const tabs = computed<TabsItem[]>(() => [
  { label: t('msg.pending'), value: 'pending', badge: props.notCompletedTasks.length.toString(), slot: 'pending' },
  { label: t('msg.completed'), value: 'completed', badge: props.completedTasks.length.toString(), slot: 'completed' },
])

function handleTaskToggle(task: Task) {
  emit('update:task-status', { status: !task.complete, taskId: task.id })
}
</script>
