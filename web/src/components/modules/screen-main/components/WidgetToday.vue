<template>
    <WidgetBase
        :completed-tasks="tasksCompleted"
        :not-completed-tasks="tasksNotCompleted"
        :title="t('msg.todayTasks')"
        :date-color="dateColor"
        :explanation="t('msg.todayExplanation')"
        :motivation="motivation"
        gradient-from="#4f46e5"
        gradient-to="#7c3aed"
        widget-type="today"
        @update:task-status="updateTaskStatus"
    >
        <template #actions>
            <MainScreenAddTaskDialog 
                v-model="addTaskDialogModel"
                :title="t('msg.addTaskToToday')"
                :disabled="!goalsStore.goals.filter(g => !g.archive).length"
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
    </WidgetBase>
</template>
<script lang="ts" setup>
import { mdiPlus } from '@mdi/js';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MainScreenAddTaskDialog from '@/components/Screens/MainScreenAddTaskDialog.vue';
import TRoundedBtn from '@/components/tv-ui/buttons/TRoundedBtn/TRoundedBtn.vue';
import { useWidgetButtonStyles } from '@/composition/useWidgetButtonStyles';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useGoalsStore } from '@/stores/goals.store';
import type { TaskItem } from '@/types/tasks.types';
import WidgetBase from './WidgetBase.vue';

const { tm, t } = useI18n();

const addTaskButtonStyles = useWidgetButtonStyles();

const baseScreenStore = useBaseScreenStore();
const addTaskDialogModel = ref(false);
const goalsStore = useGoalsStore();

const motivation = computed(() => tm('motivationToday')[Math.floor(Math.random() * tm('motivationToday').length)]);

const tasksNotCompleted = computed(() => baseScreenStore.tasksToday.filter((task) => !task.complete));
const tasksCompleted = computed(() => baseScreenStore.tasksToday.filter((task) => task.complete));

const updateTaskStatus = (data: { status: boolean; taskId: TaskItem['id'] }) => {
    baseScreenStore.updateTaskStatusNew(data, 'tasksToday');
};

const dateColor = (date: string) => {
    return date !== t('msg.today');
};
</script>

