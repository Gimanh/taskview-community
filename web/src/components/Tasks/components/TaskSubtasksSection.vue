<template>
    <div
        v-if="canViewTaskSubtasks && expand"
        class="tv-subtask d-flex ga-4 flex-column"
        :class="paddingValue"
    >
        <template
            v-for="subTask in task.subtasks"
            :key="subTask.id"
        >
            <TaskSubtaskItem
                :task="subTask"
                :last-added-task="lastAddedTask"
                :parent-task="task"
            />
        </template>
        <TaskAddSubtask
            :task-id="task.id"
            :list-id="props.listId"
            @added="lastAddedTask = $event"
        />
    </div>
</template>

<script setup lang="ts">
import type { GoalListItem, Task } from 'taskview-api';
import { ref, watch } from 'vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import TaskAddSubtask from './TaskAddSubtask.vue';
import TaskSubtaskItem from './TaskSubtaskItem.vue';

const props = defineProps<{ task: Task; expand: boolean; listId: GoalListItem['id'] }>();
const { canViewTaskSubtasks } = useGoalPermissions();
const paddingValue = ref('');
const lastAddedTask = ref(-1);

watch(
    () => props.task.subtasks.length,
    () => {
        if (props.task.subtasks.length > 0) {
            setTimeout(() => {
                paddingValue.value = 'pl-6';
            }, 400);
        }
    },
    { immediate: true }
);
</script>
