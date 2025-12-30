<template>
    <div class="rounded-2xl w-full flex flex-col overflow-hidden shadow-tv-md">
        <!-- class="h-16 w-full flex items-center px-5" 
            :style="gradientStyle" -->
        <div 
            class="h-16 min-h-16 gap-2 w-full flex items-center px-5 bg-gray-200 dark:bg-gray-700"
            @click="changeActiveWidget(props.widgetType)"
        > 
            <VIcon
                v-if="baseScreenStore.activeWidgetInMobile !== 'all'"
                :icon="mdiChevronRight"
                :class="{
                    'rotate-90 transition-all duration-300': baseScreenStore.activeWidgetInMobile === props.widgetType,
                    'rotate-0 transition-all duration-300': baseScreenStore.activeWidgetInMobile !== props.widgetType
                }"
            />
            <h1 class="font-bold text-lg text-black dark:text-white">
                <slot name="title" />
            </h1>
            <div class="flex-grow h-full" />
            <slot name="actions" />
        </div>
        <!-- <div> -->
        <slot name="content" />
        <!-- </div> -->
    </div>
</template>

<script lang="ts" setup>
import { mdiChevronRight } from '@mdi/js';
import { useMobile } from '@/composition/useMobile';
import { useBaseScreenStore } from '@/stores/base-screen.store';

interface Props {
    gradientFrom?: string;
    gradientTo?: string;
    gradientDirection?: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-tr' | 'to-tl' | 'to-br' | 'to-bl';
    widgetType: 'today' | 'lastAdded' | 'upcoming';
}

const props = withDefaults(defineProps<Props>(), {
    gradientFrom: 'var(--gradient-today-start, #4f46e5)',
    gradientTo: 'var(--gradient-today-end, #7c3aed)',
    gradientDirection: 'to-r',
});

const baseScreenStore = useBaseScreenStore();

const isMobile = useMobile();
const changeActiveWidget = (widgetType: 'today' | 'lastAdded' | 'upcoming') => {
    if (!isMobile.isMobile.value) {
        baseScreenStore.activeWidgetInMobile = 'all';
        return;
    }
    if (baseScreenStore.activeWidgetInMobile === widgetType) {
        baseScreenStore.activeWidgetInMobile = null;
    } else {
        baseScreenStore.activeWidgetInMobile = widgetType;
    }
};

// const gradientStyle = computed(() => ({
//     background: `linear-gradient(${props.gradientDirection === 'to-r' ? 'to right' :
//         props.gradientDirection === 'to-l' ? 'to left' :
//         props.gradientDirection === 'to-t' ? 'to top' :
//         props.gradientDirection === 'to-b' ? 'to bottom' :
//         props.gradientDirection === 'to-tr' ? 'to top right' :
//         props.gradientDirection === 'to-tl' ? 'to top left' :
//         props.gradientDirection === 'to-br' ? 'to bottom right' :
//         'to bottom left'}, ${props.gradientFrom}, ${props.gradientTo})`
// }))
</script>

