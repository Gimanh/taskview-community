<template>
  <ProjectDashboardSkeleton v-if="loading" />
  <UAlert
    v-else-if="failed"
    color="error"
    variant="subtle"
    icon="i-lucide-triangle-alert"
    :title="t('projectDashboard.error.title')"
    :actions="[{ label: t('projectDashboard.error.retry'), color: 'neutral', variant: 'outline', onClick: reload }]"
    data-testid="main-dashboard-error"
  />
  <UEmpty
    v-else-if="model && !model.totals.total"
    icon="i-lucide-layout-dashboard"
    :title="t('projectDashboard.empty.title')"
    :description="t('projectDashboard.empty.descriptionAll')"
    variant="naked"
    class="py-16"
    data-testid="main-dashboard-empty"
  />
  <div
    v-else-if="model"
    class="flex flex-col gap-4 pb-2 lg:pb-0"
    data-testid="main-dashboard"
  >
    <div class="flex flex-col gap-4 lg:flex-row">
      <ProjectDashboardHero
        :model="model"
        variant="pace"
        class="min-w-0 lg:flex-[7]"
      />
      <ProjectDashboardRunway
        :runway="model.runway"
        :overdue="model.totals.overdue"
        :undated="model.totals.undated"
        class="min-w-0 lg:flex-[5]"
        @select="bucket.select"
      />
    </div>
    <div class="flex flex-col gap-4 lg:flex-row">
      <ProjectDashboardAttention
        :items="model.attention"
        :total="model.attentionTotal"
        show-project
        class="min-w-0 lg:flex-[4]"
      />
      <ProjectDashboardWorkload
        v-if="model.workload"
        :rows="model.workload"
        :hours-total="model.hoursTotal"
        class="min-w-0 lg:flex-[5]"
      />
      <ProjectDashboardBreakdown
        v-if="model.priorities"
        :open="model.totals.open"
        :statuses="null"
        :priorities="model.priorities"
        class="min-w-0 lg:flex-[3]"
      />
    </div>
    <div class="flex flex-col gap-4 lg:flex-row">
      <MainDashboardProjects
        v-if="projects.length"
        :projects="projects"
        class="min-w-0 lg:flex-[6]"
      />
      <ProjectDashboardWeeklyBars
        :weeks="model.weeks"
        :last7-days="model.completedLast7Days"
        class="min-w-0 lg:flex-[6]"
        @select="bucket.select"
      />
    </div>
    <ProjectDashboardBucketModal
      v-model:open="bucket.isOpen.value"
      :selection="bucket.selection.value"
      :items="bucket.items.value"
      :total="bucket.total.value"
      :loading="bucket.loading.value"
      :failed="bucket.failed.value"
      show-project
      @more="bucket.more"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useMainDashboard } from '@/composables/useMainDashboard'
import { useMainDashboardBucket } from '@/composables/useMainDashboardBucket'
import ProjectDashboardAttention from '@/components/features/project-dashboard/parts/ProjectDashboardAttention.vue'
import ProjectDashboardBreakdown from '@/components/features/project-dashboard/parts/ProjectDashboardBreakdown.vue'
import ProjectDashboardBucketModal from '@/components/features/project-dashboard/parts/ProjectDashboardBucketModal.vue'
import ProjectDashboardHero from '@/components/features/project-dashboard/parts/ProjectDashboardHero.vue'
import ProjectDashboardRunway from '@/components/features/project-dashboard/parts/ProjectDashboardRunway.vue'
import ProjectDashboardSkeleton from '@/components/features/project-dashboard/parts/ProjectDashboardSkeleton.vue'
import ProjectDashboardWeeklyBars from '@/components/features/project-dashboard/parts/ProjectDashboardWeeklyBars.vue'
import ProjectDashboardWorkload from '@/components/features/project-dashboard/parts/ProjectDashboardWorkload.vue'
import MainDashboardProjects from './parts/MainDashboardProjects.vue'

const { t } = useI18n()
const { model, projects, loading, failed, reload } = useMainDashboard()
const bucket = useMainDashboardBucket()
</script>
