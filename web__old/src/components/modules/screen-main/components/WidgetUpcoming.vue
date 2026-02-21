<template>
    <WidgetBase
        :completed-tasks="tasksCompleted"
        :not-completed-tasks="tasksNotCompleted"
        :title="$t('msg.upcomingTasks')"
        :explanation="$t('msg.upcomingExplanation')"
        :motivation="motivation"
        gradient-from="#8b5cf6"
        gradient-to="#d946ef"
        widget-type="upcoming"
        @update:task-status="updateTaskStatus"
    >
        <template #actions>
            <MainScreenAddTaskDialog 
                v-model="addUpcomingTaskDialogModel"
                :title="$t('msg.addTaskToUpcoming')"
                :disabled="!goalsStore.goals.filter(g => !g.archive).length"
                upcoming-task             
                @added="addUpcomingTaskDialogModel = false"
                @close="addUpcomingTaskDialogModel = false"
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
    </WidgetBase>
</template>
<script lang="ts" setup>
import { mdiPlus } from '@mdi/js';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MainScreenAddTaskDialog from '@/components/Screens/MainScreenAddTaskDialog.vue';
import TRoundedBtn from '@/components/tv-ui/buttons/TRoundedBtn/TRoundedBtn.vue';
import { useWidgetButtonStyles } from '@/composition/useWidgetButtonStyles';
import { debounce } from '@/helpers/app-helper';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useGoalsStore } from '@/stores/goals.store';
import type { TaskItem } from '@/types/tasks.types';
import WidgetBase from './WidgetBase.vue';

const { tm, t: $t } = useI18n();
const baseScreenStore = useBaseScreenStore();
const addUpcomingTaskDialogModel = ref(false);
const goalsStore = useGoalsStore();
const addTaskButtonStyles = useWidgetButtonStyles();

const motivation = computed(
    () => tm('motivationUpcoming')[Math.floor(Math.random() * tm('motivationUpcoming').length)]
);

const tasksNotCompleted = computed(() => baseScreenStore.tasksUpcoming.filter((task) => !task.complete));
const tasksCompleted = computed(() => baseScreenStore.tasksUpcoming.filter((task) => task.complete));

const updateTaskStatus = debounce((data: { status: boolean; taskId: TaskItem['id'] }) => {
    baseScreenStore.updateTaskStatusNew(data, 'tasksUpcoming');
}, 500);
</script>

