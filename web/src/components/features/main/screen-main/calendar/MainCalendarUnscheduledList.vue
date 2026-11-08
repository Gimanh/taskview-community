<template>
  <CalendarUnscheduledDrawer
    v-if="drawer"
    v-model:open="drawerOpen"
  >
    <template #picker>
      <MainCalendarProjectPicker />
    </template>
  </CalendarUnscheduledDrawer>
  <CalendarUnscheduledPanel
    v-else
    :drop-target="dropTarget"
    @close="emit('close')"
  >
    <template #picker>
      <MainCalendarProjectPicker />
    </template>
  </CalendarUnscheduledPanel>
</template>

<script setup lang="ts">
import CalendarUnscheduledPanel from '@/components/features/calendar/parts/CalendarUnscheduledPanel.vue'
import CalendarUnscheduledDrawer from '@/components/features/calendar/parts/CalendarUnscheduledDrawer.vue'
import { useCalendarUnscheduledLoader } from '@/composables/useCalendarUnscheduled'
import MainCalendarProjectPicker from './MainCalendarProjectPicker.vue'

// A child of MainCalendarUnscheduled, which provides the picked project's permissions to the panel
// and to the loader here: the loader pages and filters with them
const props = defineProps<{
  goalId: number
  drawer: boolean
  dropTarget: boolean
}>()

const drawerOpen = defineModel<boolean>('drawerOpen', { default: false })

const emit = defineEmits<{ close: [] }>()

useCalendarUnscheduledLoader(() => props.goalId)
</script>
