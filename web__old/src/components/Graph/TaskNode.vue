<template>
    <div
        class="bg-[rgb(var(--v-theme-surface))] rounded-lg w-96"
    >
        <Handle
            v-if="props.data.direction !== 'LR'"
            type="target"
            :position="Position.Bottom"
            :style="targetHandleStyle"
        />

        <Handle
            v-if="props.data.direction !== 'LR'"
            type="source"
            :position="Position.Top"
            :style="sourceHandleStyle"
        />

        <Handle 
            v-if="props.data.direction === 'LR'"
            type="target"
            :position="Position.Left"
            :style="targetHandleStyle"
        />
        <Handle
            v-if="props.data.direction === 'LR'"
            type="source"
            :position="Position.Right"
            :style="sourceHandleStyle"
        />

        <TaskItemMain :task="props.data.task" />
    </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';
import type { TaskItem } from '@/types/tasks.types';
import TaskItemMain from '../Tasks/components/TaskItemMain.vue';

type ListNodeProps = {
    toolbarVisible: boolean;
    toolbarPosition: Position;
    label: string;
    task: TaskItem;
    direction?: 'LR' | 'TB';
};

const props = defineProps<{ data: ListNodeProps }>();

const handleStyle = computed(() => {
    return {
        width: '22px',
        height: '22px',
    };
});

const targetHandleStyle = computed(() => {
    return {
        ...handleStyle.value,
        background: '#ff4081',
    };
});

const sourceHandleStyle = computed(() => {
    return {
        ...handleStyle.value,
        background: '#00c853',
    };
});
</script>

