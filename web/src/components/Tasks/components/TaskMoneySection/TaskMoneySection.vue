<template>
    <v-row>
        <v-col
            cols="12"
            sm="6"
            class="ga-5 d-flex flex-column"
        >
            <TaskAmount 
                v-if="task"
                :task="task"
            />
        </v-col>
        <v-col
            cols="12"
            sm="6"
            class="ga-5 d-flex flex-column"
        >
            <TaskTransactionType 
                v-if="task"
                :task="task"
            />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import type { TaskItem } from '@/types/tasks.types';
import TaskAmount from '../TaskAmount/TaskAmount.vue';
import TaskTransactionType from '../TaskTransactionType/TaskTransactionType.vue';

defineProps<{ task: TaskItem }>();
</script>