<template>
  <div class="relative">
    <!-- Timeline connecting line under the icon -->
    <div class="absolute left-6 top-14 bottom-0 w-px bg-accented hidden sm:block" />

    <UCollapsible
      v-model:open="expanded"
      :ui="{ content: 'p-0 pl-0 sm:pl-16 pb-8' }"
    >
      <DashboardSectionHeader
        :icon="icon"
        :accent="accentClasses"
        :title="title"
        :subtitle="subtitle"
        :expanded="expanded"
        :show-progress="showProgress"
        :done-count="doneCount"
        :total-count="totalCount"
        :progress-percent="progressPercent"
        :add-title="addTitle"
        :add-disabled="!hasActiveGoals"
        :upcoming-task="upcomingTask"
        :no-dates="noDates"
        :groupable="groupable"
        :grouped="grouped"
        @toggle-group="grouped = !grouped"
      />

      <template #content>
        <!-- Tabbed mode: split active / completed into tabs (used by Recent) -->
        <UTabs
          v-if="tabbed"
          v-model="activeTab"
          :items="tabItems"
          variant="pill"
          size="md"
          class="w-full pt-3"
          :ui="{ list: 'rounded-full', trigger: 'rounded-full', indicator: 'rounded-full' }"
        >
          <template #active>
            <div class="flex flex-col gap-2 pt-3">
              <TaskItem
                v-for="task in tasks"
                :key="task.id"
                :task="task"
                @toggle="$emit('toggle', $event, 'pending')"
              />
              <p
                v-if="!tasks.length"
                class="text-sm text-muted text-center py-4"
              >
                {{ t('msg.noTasks') }}
              </p>
              <DashboardAddTask
                :title="addTitle"
                :disabled="!hasActiveGoals"
                :no-dates="noDates"
              />
            </div>
          </template>
          <template #completed>
            <div class="flex flex-col gap-2 pt-3">
              <TaskItem
                v-for="task in completedTasks"
                :key="task.id"
                :task="task"
                @toggle="$emit('toggle', $event, 'completed')"
              />
              <p
                v-if="!completedTasks.length"
                class="text-sm text-muted text-center py-4"
              >
                {{ t('msg.noTasks') }}
              </p>
            </div>
          </template>
        </UTabs>

        <!-- Default stacked mode: pending list + add + completed group -->
        <div
          v-else
          class="flex flex-col gap-3 pt-3"
        >
          <div
            v-if="groupable && grouped && tasks.length"
            class="flex flex-col gap-4"
          >
            <div
              v-for="group in taskGroups"
              :key="group.key"
              class="flex flex-col gap-2"
            >
              <div class="flex items-center gap-3 px-1">
                <span class="text-sm text-highlighted opacity-80 font-medium">
                  {{ group.label }}
                </span>
                <span class="text-xs text-muted">{{ group.tasks.length }}</span>
                <div class="flex-1 h-px bg-default" />
              </div>
              <TaskItem
                v-for="task in group.tasks"
                :key="task.id"
                :task="task"
                @toggle="$emit('toggle', $event, 'pending')"
              />
            </div>
          </div>

          <div
            v-else-if="tasks.length"
            class="flex flex-col gap-2"
          >
            <TaskItem
              v-for="task in tasks"
              :key="task.id"
              :task="task"
              @toggle="$emit('toggle', $event, 'pending')"
            />
          </div>

          <DashboardAddTask
            :title="addTitle"
            :disabled="!hasActiveGoals"
            :upcoming-task="upcomingTask"
            :no-dates="noDates"
          />

          <div
            v-if="completedTasks.length"
            class="flex flex-col gap-1 mt-2"
          >
            <div class="flex items-center gap-3 px-1">
              <span class="text-xs font-semibold uppercase tracking-wide text-success">
                {{ t('msg.completed') }} · {{ completedTasks.length }}
              </span>
              <div class="flex-1 h-px bg-default" />
            </div>
            <TaskItem
              v-for="task in completedTasks"
              :key="task.id"
              :task="task"
              @toggle="$emit('toggle', $event, 'completed')"
            />
          </div>
        </div>
      </template>
    </UCollapsible>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TabsItem } from '@nuxt/ui'
import type { TaskItem as TaskItemType } from '@/types/tasks.types'
import { useTaskView } from '@/composables/useTaskView'
import { useLsRef } from '@/composables/useLsRef'
import TaskItem from '@/components/features/tasks/parts/TaskItem.vue'
import DashboardAddTask from './DashboardAddTask.vue'
import DashboardSectionHeader from './DashboardSectionHeader.vue'

type Accent = 'indigo' | 'sky' | 'violet'
type TaskBucket = 'pending' | 'completed'

const props = withDefaults(defineProps<{
  icon: string
  accent: Accent
  title: string
  subtitle: string
  addTitle: string
  tasks: TaskItemType[]
  completedTasks: TaskItemType[]
  upcomingTask?: boolean
  noDates?: boolean
  showProgress?: boolean
  tabbed?: boolean
  groupable?: boolean
  sectionKey: string
}>(), {
  showProgress: true,
})

defineEmits<{
  toggle: [task: TaskItemType, bucket: TaskBucket]
}>()

const { t, locale } = useI18n()
const { hasActiveGoals } = useTaskView()

const grouped = useLsRef(`taskview:dashboard:${props.sectionKey}:grouped`, true)

const NO_DATE_KEY = '~'

function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function groupLabel(key: string): string {
  const date = new Date(`${key}T00:00:00`)
  const day = new Intl.DateTimeFormat(locale.value, { day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(date)
  const weekday = new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(date)
  const formatted = `${day} ${month} ${weekday}`
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const taskGroups = computed(() => {
  const groups = new Map<string, TaskItemType[]>()
  for (const task of props.tasks) {
    const key = task.endDate ? dateKey(new Date(task.endDate)) : NO_DATE_KEY
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(task)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, tasks]) => ({ key, label: key === NO_DATE_KEY ? t('msg.noDeadline') : groupLabel(key), tasks }))
})

const ACCENTS: Record<Accent, { bg: string; icon: string; bar: string }> = {
  indigo: { bg: 'bg-indigo-500/15', icon: 'text-indigo-500', bar: 'bg-indigo-500' },
  sky: { bg: 'bg-sky-500/15', icon: 'text-sky-500', bar: 'bg-sky-500' },
  violet: { bg: 'bg-violet-500/15', icon: 'text-violet-500', bar: 'bg-violet-500' },
}

const accentClasses = computed(() => ACCENTS[props.accent])

const expanded = useLsRef(`taskview:dashboard:${props.sectionKey}:expanded`, true)

const activeTab = ref('active')
const tabItems = computed<TabsItem[]>(() => [
  {
    label: t('msg.lastAddedTasks'),
    value: 'active',
    slot: 'active',
    badge: props.tasks.length.toString(),
  },
  {
    label: t('msg.lastCompletedTasks'),
    value: 'completed',
    slot: 'completed',
    badge: props.completedTasks.length.toString(),
  },
])

const doneCount = computed(() => props.completedTasks.length)
const totalCount = computed(() => props.tasks.length + props.completedTasks.length)
const progressPercent = computed(() =>
  totalCount.value === 0 ? 0 : Math.round((doneCount.value / totalCount.value) * 100),
)
</script>
