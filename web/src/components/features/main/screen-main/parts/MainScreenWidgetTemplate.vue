<template>
  <div class="rounded-2xl w-full flex flex-col overflow-hidden shadow-md">
    <div
      class="h-16 min-h-16 gap-2 w-full flex items-center px-5 bg-gray-200 dark:bg-gray-700 cursor-pointer"
      @click="changeActiveWidget(props.widgetType)"
    >
      <UIcon
        v-if="baseScreenStore.activeWidgetInMobile !== 'all'"
        name="i-lucide-chevron-right"
        :class="[
          'size-5 transition-all duration-300',
          baseScreenStore.activeWidgetInMobile === props.widgetType ? 'rotate-90' : 'rotate-0'
        ]"
      />
      <h1 class="font-bold text-lg text-black dark:text-white">
        <slot name="title" />
      </h1>
      <div class="grow h-full" />
      <slot name="actions" />
    </div>
    <slot name="content" />
  </div>
</template>

<script lang="ts" setup>
import { useTaskView } from '@/composables/useTaskView'
import { useBaseScreenStore } from '@/stores/base-screen.store'

interface Props {
  gradientFrom?: string
  gradientTo?: string
  gradientDirection?: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-tr' | 'to-tl' | 'to-br' | 'to-bl'
  widgetType: 'today' | 'lastAdded' | 'upcoming'
}

const props = withDefaults(defineProps<Props>(), {
  gradientFrom: 'var(--gradient-today-start, #4f46e5)',
  gradientTo: 'var(--gradient-today-end, #7c3aed)',
  gradientDirection: 'to-r',
})

const baseScreenStore = useBaseScreenStore()

const { isMobile } = useTaskView()
const changeActiveWidget = (widgetType: 'today' | 'lastAdded' | 'upcoming') => {
  if (!isMobile.value) {
    baseScreenStore.activeWidgetInMobile = 'all'
    return
  }
  if (baseScreenStore.activeWidgetInMobile === widgetType) {
    baseScreenStore.activeWidgetInMobile = null
  } else {
    baseScreenStore.activeWidgetInMobile = widgetType
  }
}
</script>
