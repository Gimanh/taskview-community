<template>
    <TPriority
        v-model="model"
        :can-edit-task-priority="canEditTaskPriority"
    />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TPriority from '@/components/tv-ui/TPriority.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useTasksStore } from '@/stores/tasks.store';
import type { PriorityItem } from '@/types/task-history.types';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem }>();
const model = ref(props.task.priorityId);
const tasksStorage = useTasksStore();
const { canEditTaskPriority } = useGoalPermissions();

watch(
    () => model.value,
    async (val: PriorityItem['id']) => {
        await tasksStorage.udpatePriority({ id: props.task.id, priorityId: val });

        if (props.task.priorityId !== val) {
            alert('Can not update priority for this task');
        }
        model.value = props.task.priorityId;
    }
);
</script>
