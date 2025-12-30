<template>
    <TasksFiltersCommon
        :goal-id="goalListsStore.currentGoalId"
        @updated-filters="updatedFilters"
    >
        <template #activator="props">
            <v-btn
                v-bind="props"
                :color="hasFilters ? 'primary' : undefined"
                icon
                size="small"
                elevation="0"
            >
                <v-icon size="large">
                    {{ mdiFilterVariantPlus }}
                </v-icon>
            </v-btn>
        </template>

        <template #append>
            <v-card
                class="rad10 pa-2 flex-shrink-0 d-flex align-center"
                height="56px"
            >
                <ToggleCompletedTasks />
            </v-card>
        </template>
    </TasksFiltersCommon>
</template>
<script setup lang="ts">
import { mdiFilterVariantPlus } from '@mdi/js';
import type { TaskFilters } from 'taskview-api';
import { computed, ref } from 'vue';
import ToggleCompletedTasks from '@/components/Atoms/ToggleCompletedTasks.vue';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useTasksStore } from '@/stores/tasks.store';
import TasksFiltersCommon from './TasksFiltersCommon.vue';

const tasksStore = useTasksStore();
const goalListsStore = useGoalListsStore();

const filters = ref<TaskFilters>({
    selectedTags: {},
    priority: undefined,
    selectedUser: undefined,
});

const hasFilters = computed(
    () =>
        (filters.value.selectedTags && Object.keys(filters.value.selectedTags).length > 0) ||
        !!filters.value.selectedUser ||
        filters.value.priority
);

async function updatedFilters(e: TaskFilters) {
    filters.value = e;
    tasksStore.resetTasks();
    tasksStore.updateFetchRules({
        filters: filters.value,
        endOfTasks: false,
        currentPage: 0,
    });

    await tasksStore.fetchTasks();
}
</script>
