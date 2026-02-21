<template>
    <v-card
        class="rad10 pl-1 pr-1 d-flex ga-1 pa-2 items-center"
        style="flex-shrink: 0; position: sticky; top: 0px; backdrop-filter: blur(10px); z-index: 1"
    >
        <TaskBackToLists />
        <v-spacer />

        <TasksFilterInList />

        <TasksReorder />
        <ToggleCompletedTasks only-icon />
    </v-card>
</template>

<script setup lang="ts">
import ToggleCompletedTasks from '@/components/Atoms/ToggleCompletedTasks.vue';
import TaskBackToLists from './TaskBackToLists.vue';
import TasksFilterInList from './TasksFilterInList.vue';
import TasksReorder from './TasksReorder.vue';
</script>
