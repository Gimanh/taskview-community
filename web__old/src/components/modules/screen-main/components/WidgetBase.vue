<template>
    <MainScreenWidgetTemplate
        :gradient-from="props.gradientFrom"
        :gradient-to="props.gradientTo"
        :widget-type="props.widgetType"
    >
        <template #title>
            <div>
                {{ props.title }}
            </div>
        </template>
        <template #actions>
            <slot name="actions" />
        </template>
        <template
            v-if="props.widgetType === baseScreenStore.activeWidgetInMobile || baseScreenStore.activeWidgetInMobile === 'all'"
            #content
        >
            <TTabs
                v-model="activeBasicTab"
                :tabs="tabs"
            >
                <template #pending>
                    <div
                        v-if="props.notCompletedTasks.length === 0"
                        :class="noTasksClass"
                    >
                        <div class="text-xl text-gray-500 dark:text-gray-400 p-5 text-center mt-5">
                            {{ props.motivation }}
                        </div>

                        <div
                            v-if="props.explanation"
                            class="p-5"
                        >
                            <div class="text-center bg-task-item-bg px-5 py-2 rounded-tv10 shadow-md opacity-50 text-sm font-normal">
                                {{ props.explanation }}
                            </div>
                        </div>
                        <div class="flex-grow" /> 
                        <NoGoals />
                    </div>
                    <div
                        v-else
                        v-bind="scrollContainerData"
                    >
                        <!-- <AnimatePresence> -->
                        <template
                            v-for="task in props.notCompletedTasks"
                            :key="task.id"
                        >
                            <!-- <motion.div
                                    v-bind="animation"
                                    class="flex flex-col"
                                > -->
                            <TaskItemMain
                                :task="task"
                                :emit-event="true"
                                @update:task-status="emit('update:task-status', $event)"
                            />
                            <!-- </motion.div> -->
                        </template>
                        <!-- </AnimatePresence> -->
                    </div>
                </template>
                <template #completed>
                    <div
                        v-if="props.completedTasks.length === 0"
                        :class="noTasksClass"
                    >
                        <div class="p-5 opacity-50">
                            {{ t('msg.noTasks') }}
                        </div>
                        <NoGoals />
                    </div>
                    <div
                        v-else
                        v-bind="scrollContainerData"
                    >
                        <!-- <AnimatePresence> -->
                        <template
                            v-for="task in props.completedTasks"
                            :key="task.id"
                        >
                            <!-- <motion.div
                                    v-bind="animation"
                                    class="flex flex-col gap-2"
                                > -->
                            <TaskItemMain
                                :task="task"
                                :emit-event="true"
                                @update:task-status="emit('update:task-status', $event)"
                            />
                            <!-- </motion.div> -->
                        </template>
                        <!-- </AnimatePresence> -->
                    </div>
                </template>
            </TTabs>
        </template>
    </MainScreenWidgetTemplate>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TaskItemMain from '@/components/Tasks/components/TaskItemMain.vue';
import TTabs from '@/components/tv-ui/tabs/TTabs.vue';
import { useWidgetScrollContainer } from '@/composition/useWidgetScrollContainer';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import type { TaskItem } from '@/types/tasks.types';
import MainScreenWidgetTemplate from './MainScreenWidgetTemplate.vue';
import NoGoals from './NoGoals.vue';

const props = defineProps<{
    title: string;
    completedTasks: TaskItem[];
    notCompletedTasks: TaskItem[];
    gradientFrom: string;
    gradientTo: string;
    explanation?: string;
    dateColor?: (date: string) => boolean;
    motivation?: string;
    widgetType: 'today' | 'lastAdded' | 'upcoming';
}>();

const emit = defineEmits<(e: 'update:task-status', data: { status: boolean; taskId: TaskItem['id'] }) => void>();

const { t } = useI18n();

const scrollContainerData = useWidgetScrollContainer();
const baseScreenStore = useBaseScreenStore();

const activeBasicTab = ref('pending');

// const tabContentClass = 'flex flex-col gap-2 overflow-y-auto max-h-[300px] overflow-x-hidden h-full p-3 md:p-5';
const noTasksClass = 'min-h-24 flex flex-col items-center justify-center font-bold gap-2 h-full';

const tabs = computed(() => [
    { key: 'pending', label: t('msg.pending'), badge: props.notCompletedTasks.length.toString() },
    { key: 'completed', label: t('msg.completed'), badge: props.completedTasks.length.toString() },
]);

// const animation = useWidgetStartScreenTaskAnimation();
</script>

<style lang="scss" scoped>
:deep(.task-item){
    @apply bg-red-500;
}
</style>