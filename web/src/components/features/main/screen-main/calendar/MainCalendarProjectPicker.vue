<template>
  <USelectMenu
    v-model="picked"
    :items="projectItems"
    value-key="value"
    size="sm"
    :placeholder="t('calendar.main.pickProject')"
    :search-input="{ placeholder: t('calendar.main.findProject') }"
    class="w-full"
    data-testid="main-calendar-plan-project"
  >
    <template #item-leading="{ item }">
      <ProjectMarkerIcon
        :color="item.color"
        :inbox="item.inbox"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGoalsStore } from '@/stores/goals.store'
import { useInbox } from '@/composables/useInbox'
import { useMainCalendarPlanProject } from '@/composables/useCalendarRouteState'
import { projectColor } from '@/helpers/color'
import ProjectMarkerIcon from '@/components/features/projects/parts/ProjectMarkerIcon.vue'

const { t } = useI18n()
const goalsStore = useGoalsStore()
const { isOwnInbox } = useInbox()
const planProject = useMainCalendarPlanProject()

const picked = computed<number | undefined>({
  get: () => planProject.value ?? undefined,
  set: (id) => {
    planProject.value = id ?? null
  },
})

const projectItems = computed(() => goalsStore.goals
  .filter((goal) => !goal.archive)
  .map((goal) => ({
    value: goal.id,
    label: isOwnInbox(goal) ? t('projects.inbox') : goal.name,
    color: isOwnInbox(goal) ? null : projectColor(goal),
    inbox: isOwnInbox(goal),
  })))
</script>
