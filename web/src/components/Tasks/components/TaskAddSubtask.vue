<template>
    <v-btn
        v-if="canAddTaskSubtasks"
        :prepend-icon="mdiPlus"
        :text="t('task.addSubtask')"
        elevation="1"
        class="rad10 w100 justify-start txt-subtitle-2 tv-add-subtask"
        height="56px"
        @click="addSubtask"
    />
</template>

<script setup lang="ts">
import { mdiPlus } from '@mdi/js';
import type { GoalListItem } from 'taskview-api';
import { useI18n } from 'vue-i18n';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ taskId: TaskItem['id']; listId: GoalListItem['id'] }>();
const emits = defineEmits<(e: 'added', id: TaskItem['id']) => void>();
const { canAddTaskSubtasks } = useGoalPermissions();
const tasksStore = useTasksStore();
const { t } = useI18n();

async function addSubtask() {
    const componentId = props.listId;
    if (componentId) {
        const result = await tasksStore.addTask({
            description: t('task.task'),
            goalListId: +componentId,
            parentId: props.taskId,
            goalId: tasksStore.fetchRules.goalId,
        });
        if (result) {
            emits('added', result.id);
        }
    }
}
</script>
