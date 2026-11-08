<template>
  <MainCalendarUnscheduledList
    v-if="goal"
    v-model:drawer-open="drawerOpen"
    :goal-id="goal.id"
    :drawer="drawer"
    :drop-target="dropTarget"
    @close="emit('close')"
  />
  <CalendarUnscheduledDrawer
    v-else-if="drawer"
    v-model:open="drawerOpen"
    waiting
  >
    <template #picker>
      <MainCalendarProjectPicker />
    </template>
  </CalendarUnscheduledDrawer>
  <CalendarUnscheduledPanel
    v-else
    waiting
    @close="emit('close')"
  >
    <template #picker>
      <MainCalendarProjectPicker />
    </template>
  </CalendarUnscheduledPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CalendarUnscheduledPanel from '@/components/features/calendar/parts/CalendarUnscheduledPanel.vue'
import CalendarUnscheduledDrawer from '@/components/features/calendar/parts/CalendarUnscheduledDrawer.vue'
import { useGoalsStore } from '@/stores/goals.store'
import { provideGoalPermissions } from '@/composables/useGoalPermissions'
import { useMainCalendarPlanProject } from '@/composables/useCalendarRouteState'
import MainCalendarProjectPicker from './MainCalendarProjectPicker.vue'
import MainCalendarUnscheduledList from './MainCalendarUnscheduledList.vue'

// The undated tasks of one project, picked here, to hand out on the main screen calendar
defineProps<{
  // On a phone the list is a drawer
  drawer: boolean
  dropTarget: boolean
}>()

const drawerOpen = defineModel<boolean>('drawerOpen', { default: false })

const emit = defineEmits<{ close: [] }>()

const goalsStore = useGoalsStore()
const planProject = useMainCalendarPlanProject()

const goal = computed(() => {
  const found = planProject.value ? goalsStore.goalMap.get(planProject.value) : undefined
  return found && !found.archive ? found : null
})

// The panel and its loader check permissions of the picked project, not of a project on screen
provideGoalPermissions(goal)
</script>
