<template>
    <MainScreenWidgetTemplate
        gradient-from="#4f46e5"
        gradient-to="#7c3aed"
        widget-type="lastAdded"
    >
        <template #title>
            <div>
                {{ t('msg.lastTasks') }}
            </div>
        </template>
        <template #actions>
            <MainScreenAddTaskDialog 
                v-model="addTaskDialogModel"
                :title="t('msg.addTaskToToday')"
                :disabled="!goalsStore.goals.filter(g => !g.archive).length"
                :no-dates="true"
                @added="addTaskDialogModel = false"
                @close="addTaskDialogModel = false"
            >
                <template #activator="props">
                    <TRoundedBtn
                        v-bind="{...props, ...addTaskButtonStyles}"
                        :icon="mdiPlus"
                        :disabled="!goalsStore.goals.filter(g => !g.archive).length"
                        size="md"
                    />   
                </template>
            </MainScreenAddTaskDialog>
        </template>
        <template
            v-if="baseScreenStore.activeWidgetInMobile === 'lastAdded' || baseScreenStore.activeWidgetInMobile === 'all'"
            #content
        >
            <TTabs
                v-model="activeBasicTab"
                :tabs="tabs"
            >
                <template #lastAdded>
                    <div
                        v-if="baseScreenStore.tasks.length === 0"
                        :class="noTasksClass"
                    >
                        <div class="p-5">
                            {{ t('msg.noTasks') }}
                        </div>

                        <div
                            class="p-5"
                        >
                            <div class="text-center bg-task-item-bg px-5 py-2 rounded-tv10 shadow-md opacity-50 text-sm font-normal">
                                {{ t('msg.lastAddedTasksExplanation') }}
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
                            v-for="task in baseScreenStore.tasks"
                            :key="task.id"
                        >
                            <!-- <motion.div
                                    v-bind="animation"
                                    class="flex flex-col"
                                > -->
                            <TaskItemMain
                                :task="task"
                                :emit-event="true"
                                @update:task-status="updateTaskStatus($event, 'tasks')"
                            />
                            <!-- </motion.div> -->
                        </template>
                        <!-- </AnimatePresence> -->
                    </div>
                </template>
                <template #lastCompleted>
                    <div
                        v-if="baseScreenStore.tasksLastCompleted.length === 0"
                        :class="noTasksClass"
                    >
                        {{ t('msg.noTasks') }}
                        <div
                            class="p-5"
                        >
                            <div class="text-center bg-task-item-bg px-5 py-2 rounded-tv10 shadow-md opacity-50 text-sm font-normal">
                                {{ t('msg.lastCompletedTasksExplanation') }}
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
                            v-for="task in baseScreenStore.tasksLastCompleted"
                            :key="task.id"
                        >
                            <!-- <motion.div
                                    v-bind="animation"
                                    class="flex flex-col gap-2"
                                > -->
                            <TaskItemMain
                                :task="task"
                                :emit-event="true"
                                @update:task-status="updateTaskStatus($event, 'tasksLastCompleted')"
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
import { mdiPlus } from '@mdi/js';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MainScreenAddTaskDialog from '@/components/Screens/MainScreenAddTaskDialog.vue';
import TaskItemMain from '@/components/Tasks/components/TaskItemMain.vue';
import TRoundedBtn from '@/components/tv-ui/buttons/TRoundedBtn/TRoundedBtn.vue';
import TTabs from '@/components/tv-ui/tabs/TTabs.vue';
import { useWidgetButtonStyles } from '@/composition/useWidgetButtonStyles';
import { useWidgetScrollContainer } from '@/composition/useWidgetScrollContainer';
import { debounce } from '@/helpers/app-helper';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useGoalsStore } from '@/stores/goals.store';
import type { TaskItem } from '@/types/tasks.types';
import MainScreenWidgetTemplate from './MainScreenWidgetTemplate.vue';
import NoGoals from './NoGoals.vue';

// const emit = defineEmits<{
//     (e: 'update:task-status', data: { status: boolean, taskId: TaskItem['id'] }): void
// }>();

const { t } = useI18n();
const baseScreenStore = useBaseScreenStore();
const goalsStore = useGoalsStore();
const activeBasicTab = ref('lastAdded');
const addTaskDialogModel = ref(false);
const scrollContainerData = useWidgetScrollContainer();
const addTaskButtonStyles = useWidgetButtonStyles();

// const tabContentClass = 'flex flex-col gap-2 overflow-y-auto max-h-[300px] overflow-x-hidden h-full p-5 ';
const noTasksClass = 'min-h-24 flex flex-col items-center justify-center font-bold gap-2 h-full';

const tabs = computed(() => [
    { key: 'lastAdded', label: t('msg.lastAddedTasks'), badge: baseScreenStore.tasks.length.toString() },
    {
        key: 'lastCompleted',
        label: t('msg.lastCompletedTasks'),
        badge: baseScreenStore.tasksLastCompleted.length.toString(),
    },
]);

// const animation = useWidgetStartScreenTaskAnimation();

const updateTaskStatus = debounce(
    (data: { status: boolean; taskId: TaskItem['id'] }, param: 'tasks' | 'tasksLastCompleted') => {
        baseScreenStore.updateTaskStatusNew(data, param);
    },
    500
);
</script>

<style lang="scss" scoped>
:deep(.task-item){
    @apply bg-red-500;
}
</style>