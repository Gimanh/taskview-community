<template>
    <div class="overflow-auto flex flex-col gap-0">
        <div class="hidden md:block sticky top-0 p-5 z-10 bg-tv-main-bg">
            <SearchAll />
        </div>
        <div class="flex flex-col gap-5 p-2 md:p-5 md:pt-0 w-12/12 mx-auto w-full"> 
            <div class="flex gap-5 flex-col md:flex-row">
                <WidgetToday />
                <WidgetUpcoming />
            </div>
            <WidgetLastAddedTasks />
            <!-- <WidgetLastCompleted class="mb-0 md:mb-10" /> -->
        </div>
    </div>
</template>
<script async setup lang="ts">
import { watch } from 'vue';
import SearchAll from '@/components/modules/screen-main/components/SearchAll.vue';
// import WidgetLastCompleted from '@/components/modules/screen-main/components/WidgetLastCompleted.vue';
import WidgetLastAddedTasks from '@/components/modules/screen-main/components/WidgetLastAddedTasks.vue';
import WidgetToday from '@/components/modules/screen-main/components/WidgetToday.vue';
import WidgetUpcoming from '@/components/modules/screen-main/components/WidgetUpcoming.vue';
import { useMobile } from '@/composition/useMobile';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useCollaborationStore } from '@/stores/collaboration.store';

const baseScreenStore = useBaseScreenStore();
const collaborationStore = useCollaborationStore();
const isMobile = useMobile();

watch(
    () => isMobile.isMobile.value,
    (newVal) => {
        if (!newVal) {
            baseScreenStore.activeWidgetInMobile = 'all';
        } else {
            baseScreenStore.activeWidgetInMobile = 'today';
        }
    },
    { immediate: true }
);

Promise.allSettled([
    baseScreenStore.fetchAllState(),
    baseScreenStore.fetchAllAvailableLists(),
    collaborationStore.fetchAllCollaborationUsers(),
]);
</script>
