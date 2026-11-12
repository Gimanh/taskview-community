<template>
  <ProjectDashboardCard
    :title="t('projectDashboard.projects.title')"
    :meta="projects.length > shown.length ? t('projectDashboard.attention.shown', { shown: shown.length, total: projects.length }) : undefined"
    data-testid="main-dashboard-projects"
  >
    <ul class="flex flex-1 flex-col justify-around gap-1">
      <li
        v-for="project in shown"
        :key="project.goalId"
      >
        <UButton
          :to="{ name: 'project-dashboard', params: { projectId: project.goalId } }"
          color="neutral"
          variant="ghost"
          class="-mx-2 flex min-h-9 w-[calc(100%+1rem)] items-center gap-2.5 px-2 text-left font-normal"
          :data-testid="`main-dashboard-project-${project.goalId}`"
        >
          <span
            class="size-2 shrink-0 rounded-full bg-inverted/40"
            :style="project.color ? { backgroundColor: project.color } : undefined"
          />
          <span
            class="min-w-0 flex-1 truncate text-sm text-highlighted sm:w-40 sm:flex-none"
            :title="project.name"
          >{{ project.name }}</span>
          <span class="hidden h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-accented sm:flex">
            <span
              class="h-full rounded-full bg-primary"
              :style="{ width: `${project.progress}%` }"
            />
          </span>
          <span class="w-10 shrink-0 text-right text-xs text-toned tabular-nums">{{ project.progress }}%</span>
          <span class="w-14 shrink-0 text-right text-xs whitespace-nowrap text-error tabular-nums sm:w-16">{{ project.overdue ? t('projectDashboard.projects.late', { count: project.overdue }) : '' }}</span>
          <span class="w-[4.5rem] shrink-0 text-right text-xs whitespace-nowrap text-muted tabular-nums sm:w-20">{{ t('projectDashboard.projects.open', { count: project.open }) }}</span>
        </UButton>
      </li>
    </ul>
  </ProjectDashboardCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectDashboardCard from '@/components/features/project-dashboard/parts/ProjectDashboardCard.vue'
import type { MainDashboardProjectRow } from '@/types/main-dashboard.types'

const MAX_PROJECTS = 8

const props = defineProps<{
  // The most overdue first, as the server sorts them
  projects: MainDashboardProjectRow[]
}>()

const { t } = useI18n()

const shown = computed(() => props.projects.slice(0, MAX_PROJECTS))
</script>
