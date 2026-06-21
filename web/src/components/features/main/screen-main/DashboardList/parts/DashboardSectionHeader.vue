<template>
  <div class="flex items-center sm:items-start gap-4 w-full cursor-pointer select-none">
    <div
      class="flex items-center justify-center size-12 rounded-2xl shrink-0"
      :class="accent.bg"
    >
      <UIcon
        :name="icon"
        class="size-6"
        :class="accent.icon"
      />
    </div>

    <div class="flex-1 min-w-0 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <h2 class="text-xl font-medium text-highlighted truncate">
            {{ title }}
          </h2>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-5 text-muted transition-transform duration-200 shrink-0"
            :class="{ '-rotate-90': !expanded }"
          />
        </div>
        <p class="text-sm text-muted hidden sm:block">
          {{ subtitle }}
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0 self-center">
        <template v-if="showProgress">
          <span class="text-sm font-semibold text-muted">{{ doneCount }}/{{ totalCount }}</span>
          <div class="w-16 h-1.5 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full transition-[width] duration-300"
              :class="accent.bar"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </template>
        <DashboardAddTask
          compact
          :title="addTitle"
          :disabled="addDisabled"
          :upcoming-task="upcomingTask"
          :no-dates="noDates"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DashboardAddTask from './DashboardAddTask.vue'

defineProps<{
  icon: string
  accent: { bg: string; icon: string; bar: string }
  title: string
  subtitle: string
  expanded: boolean
  showProgress: boolean
  doneCount: number
  totalCount: number
  progressPercent: number
  addTitle: string
  addDisabled?: boolean
  upcomingTask?: boolean
  noDates?: boolean
}>()
</script>
