<template>
  <div class="overflow-auto flex flex-col">
    <div class="sticky top-0 p-2 lg:p-5 z-10 bg-default">
      <SearchAll />
    </div>

    <div class="flex flex-col p-2 md:p-5 md:pt-0 w-full max-w-3xl mx-auto gap-5">
      <DashboardSection
        icon="i-lucide-sunrise"
        accent="indigo"
        :title="t('msg.todayTasks')"
        :subtitle="t('msg.todayExplanation')"
        :add-title="t('msg.addTaskToToday')"
        :tasks="todayPending"
        :completed-tasks="todayCompleted"
        @toggle="(task) => toggle(task, 'tasksToday')"
      />

      <DashboardSection
        icon="i-lucide-clock"
        accent="sky"
        :title="t('msg.upcomingTasks')"
        :subtitle="t('msg.upcomingExplanation')"
        :add-title="t('msg.addTaskToUpcoming')"
        :tasks="upcomingPending"
        :completed-tasks="upcomingCompleted"
        upcoming-task
        @toggle="(task) => toggle(task, 'tasksUpcoming')"
      />

      <DashboardSection
        icon="i-lucide-inbox"
        accent="violet"
        :title="t('msg.lastTasks')"
        :subtitle="t('msg.lastAddedTasksExplanation')"
        :add-title="t('msg.addTask')"
        :tasks="recentTasks"
        :completed-tasks="recentCompleted"
        no-dates
        tabbed
        :show-progress="false"
        @toggle="toggleRecent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SearchAll from './parts/SearchAll.vue'
import DashboardSection from './DashboardList/parts/DashboardSection.vue'
import type { TaskItem } from '@/types/tasks.types'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useOrganizationStore } from '@/stores/organization.store'

const { t } = useI18n()
const baseScreenStore = useBaseScreenStore()
const collaborationStore = useCollaborationStore()
const orgStore = useOrganizationStore()

const todayPending = computed(() => baseScreenStore.tasksToday.filter(task => !task.complete))
const todayCompleted = computed(() => baseScreenStore.tasksToday.filter(task => task.complete))
const upcomingPending = computed(() => baseScreenStore.tasksUpcoming.filter(task => !task.complete))
const upcomingCompleted = computed(() => baseScreenStore.tasksUpcoming.filter(task => task.complete))

const recentTasks = computed(() => baseScreenStore.tasks)
const recentCompleted = computed(() => baseScreenStore.tasksLastCompleted)

function toggle(task: TaskItem, prop: 'tasksToday' | 'tasksUpcoming') {
  baseScreenStore.updateTaskStatusNew({ status: !task.complete, taskId: task.id }, prop)
}

function toggleRecent(task: TaskItem, bucket: 'pending' | 'completed') {
  baseScreenStore.updateTaskStatusNew(
    { status: !task.complete, taskId: task.id },
    bucket === 'completed' ? 'tasksLastCompleted' : 'tasks',
  )
}

function loadData() {
  Promise.allSettled([
    baseScreenStore.fetchAllState(),
    baseScreenStore.fetchAllAvailableLists(),
    collaborationStore.fetchAllCollaborationUsers(),
  ])
}

loadData()

watch(() => orgStore.currentOrg, loadData)
</script>
