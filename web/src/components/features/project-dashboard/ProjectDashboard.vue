<template>
  <ProjectDashboardSkeleton v-if="loading" />
  <UAlert
    v-else-if="failed"
    color="error"
    variant="subtle"
    icon="i-lucide-triangle-alert"
    :title="t('projectDashboard.error.title')"
    :actions="[{ label: t('projectDashboard.error.retry'), color: 'neutral', variant: 'outline', onClick: reload }]"
    data-testid="project-dashboard-error"
  />
  <UEmpty
    v-else-if="notFound"
    icon="i-lucide-folder-x"
    :title="t('projectDashboard.notFound.title')"
    :description="t('projectDashboard.notFound.description')"
    variant="naked"
    class="py-16"
    data-testid="project-dashboard-not-found"
  />
  <UEmpty
    v-else-if="model && !model.totals.total"
    icon="i-lucide-layout-dashboard"
    :title="t('projectDashboard.empty.title')"
    :description="t('projectDashboard.empty.description')"
    :actions="[{ label: t('projectDashboard.openTasks'), icon: 'i-lucide-list-checks', to: tasksRoute }]"
    variant="naked"
    class="py-16"
    data-testid="project-dashboard-empty"
  />
  <div
    v-else-if="model"
    class="flex flex-col gap-4 pb-2 lg:pb-0"
    data-testid="project-dashboard"
  >
    <div class="flex flex-col gap-4 lg:flex-row">
      <ProjectDashboardHero
        :model="model"
        class="min-w-0 lg:flex-[7]"
      />
      <ProjectDashboardRunway
        :runway="model.runway"
        :overdue="model.totals.overdue"
        :undated="model.totals.undated"
        :sprint-name="model.sprint?.sprint.name"
        class="min-w-0 lg:flex-[5]"
        @select="bucket.select"
      />
    </div>
    <div class="flex flex-col gap-4 lg:flex-row">
      <ProjectDashboardAttention
        :items="model.attention"
        :total="model.attentionTotal"
        class="min-w-0 lg:flex-[4]"
      />
      <ProjectDashboardWorkload
        v-if="model.workload"
        :rows="model.workload"
        :hours-total="model.hoursTotal"
        class="min-w-0 lg:flex-[5]"
      />
      <ProjectDashboardBreakdown
        v-if="model.statuses || model.priorities"
        :open="model.totals.open"
        :statuses="model.statuses"
        :priorities="model.priorities"
        class="min-w-0 lg:flex-[3]"
      />
    </div>
    <div class="flex flex-col gap-4 lg:flex-row">
      <ProjectDashboardSprint
        v-if="model.sprint"
        :data="model.sprint"
        class="min-w-0 lg:flex-[3]"
      />
      <ProjectDashboardWeeklyBars
        :weeks="model.weeks"
        :last7-days="model.completedLast7Days"
        class="min-w-0 lg:flex-[9]"
        @select="bucket.select"
      />
    </div>
    <ProjectDashboardBucketModal
      v-model:open="bucket.isOpen.value"
      :selection="bucket.selection.value"
      :items="bucket.items.value"
      :total="bucket.total.value"
      @more="bucket.more"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useProjectDashboard } from '@/composables/useProjectDashboard'
import { useProjectDashboardBucket } from '@/composables/useProjectDashboardBucket'
import ProjectDashboardAttention from './parts/ProjectDashboardAttention.vue'
import ProjectDashboardBreakdown from './parts/ProjectDashboardBreakdown.vue'
import ProjectDashboardBucketModal from './parts/ProjectDashboardBucketModal.vue'
import ProjectDashboardHero from './parts/ProjectDashboardHero.vue'
import ProjectDashboardRunway from './parts/ProjectDashboardRunway.vue'
import ProjectDashboardSkeleton from './parts/ProjectDashboardSkeleton.vue'
import ProjectDashboardSprint from './parts/ProjectDashboardSprint.vue'
import ProjectDashboardWeeklyBars from './parts/ProjectDashboardWeeklyBars.vue'
import ProjectDashboardWorkload from './parts/ProjectDashboardWorkload.vue'

const props = defineProps<{
  projectId: number
}>()

const { t } = useI18n()
const { model, bucketTasks, loading, failed, notFound, reload } = useProjectDashboard(toRef(props, 'projectId'))
const bucket = useProjectDashboardBucket(bucketTasks)

const tasksRoute = computed(() => ({ name: 'user', params: { projectId: props.projectId, listId: ALL_TASKS_LIST_ID } }))
</script>
