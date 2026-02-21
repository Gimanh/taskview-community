<template>
    <v-text-field
        v-bind="$attrs"
        :slots="$slots"
        variant="underlined"
        density="compact"
        hide-details
        @update:model-value="emitUpdate"
    />
</template>

<script setup lang="ts">
import type { TaskItem } from '@/types/tasks.types';

const emit = defineEmits<(e: 'change', description: string) => void>();

function emitUpdate(description: TaskItem['description']) {
    emit('change', description);
}
</script>
