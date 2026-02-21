<template>
  <div class="overflow-auto flex flex-col gap-0">
    <div class="md:block sticky top-0 p-2 lg:p-5 z-10 bg-default">
      <SearchAll />
    </div>
    <div class="flex flex-col gap-5 p-2 md:p-5 md:pt-0 w-full mx-auto">
      <div class="flex gap-5 flex-col md:flex-row">
        <WidgetToday />
        <WidgetUpcoming />
      </div>
      <WidgetLastAddedTasks />
    </div>
  </div>
</template>
<script async setup lang="ts">
import { watch } from 'vue'
import SearchAll from './parts/SearchAll.vue'
import WidgetLastAddedTasks from './parts/WidgetLastAddedTasks.vue'
import WidgetToday from './parts/WidgetToday.vue'
import WidgetUpcoming from './parts/WidgetUpcoming.vue'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useTaskView } from '@/composables/useTaskView'

const baseScreenStore = useBaseScreenStore()
const collaborationStore = useCollaborationStore()
const { isMobile } = useTaskView()


watch(
  () => isMobile.value,
  (newVal) => {
    if (!newVal) {
      baseScreenStore.activeWidgetInMobile = 'all'
    } else {
      baseScreenStore.activeWidgetInMobile = 'today'
    }
  },
  { immediate: true },
)

Promise.allSettled([
  baseScreenStore.fetchAllState(),
  baseScreenStore.fetchAllAvailableLists(),
  collaborationStore.fetchAllCollaborationUsers(),
])
</script>
