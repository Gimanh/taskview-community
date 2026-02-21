<template>
    <v-text-field
        v-model="taskName"
        :loading="tasksStore.loading"
        :placeholder="$t('msg.addTask')"
        :prepend-inner-icon="mdiPlus"
        :append-inner-icon="inputIcon"
        variant="solo"
        hide-details
        enterkeyhint="go"
        class="mt-1 rad10-v-field max-h-[48px]"
        density="comfortable"
        spellcheck="false"
        v-bind="$attrs"
        @keyup.enter="addTask"
    />
</template>
<script setup lang="ts">
import { mdiKeyboardReturn, mdiKeyboardVariant, mdiPlus } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { computed, ref } from 'vue';
import { useTasksStore } from '@/stores/tasks.store';
import { DEFAULT_ID } from '@/types/app.types';
import { type TaskItem } from '@/types/tasks.types';
import { useKanbanStore } from '@/stores/kanban.store';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ goalId: GoalItem['id']; statusId: TaskItem['statusId']; }>();
const tasksStore = useTasksStore();
const taskName = ref('');
const inputIcon = computed(() => (taskName.value.trim() ? mdiKeyboardReturn : mdiKeyboardVariant));
const kanbanStore = useKanbanStore();
const { t: $t } = useI18n();
const addTask = async () => {
    if (!taskName.value.trim()) {
        return;
    }

    await kanbanStore.addTask({
        goalId: props.goalId,
        goalListId: null,
        description: taskName.value,
        statusId: props.statusId === DEFAULT_ID ? null : props.statusId,
    });

    taskName.value = '';
};
</script>