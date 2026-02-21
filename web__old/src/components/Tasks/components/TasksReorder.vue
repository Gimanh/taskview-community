<template>
    <v-btn
        size="small"
        icon
        elevation="0"
        @click="changeSort"
    >
        <v-icon
            :icon="icons"
            size="large"
        />
    </v-btn>
</template>

<script setup lang="ts">
import { mdiSortNumericAscending, mdiSortNumericDescending } from '@mdi/js';
import { computed, ref } from 'vue';
import { debounce } from '@/helpers/app-helper';
import { useTasksStore } from '@/stores/tasks.store';

const tasksStorage = useTasksStore();
const firstNew = ref(true);
const icons = computed(() => (firstNew.value ? mdiSortNumericAscending : mdiSortNumericDescending));

const changeSort = debounce(fetchTasks, 500);

async function fetchTasks() {
    if (tasksStorage.loading) return;
    firstNew.value = !firstNew.value;
    tasksStorage.resetTasks();
    tasksStorage.updateFetchRules({
        currentPage: 0,
        endOfTasks: false,
        firstNew: Number(firstNew.value) as 1 | 0,
    });
    await tasksStorage.fetchTasks();
}
</script>
