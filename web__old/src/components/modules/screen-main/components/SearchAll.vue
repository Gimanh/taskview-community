<template>
    <div class="relative z-10 search-all-container">
        <VMenu
            v-model="menu"
            attach="body"
        >
            <template #activator="{props}">
                <VTextField
                    v-model="search"
                    v-bind="{...textFieldStyles, ...props, ...$attrs}"
                    :placeholder="$t('admin.search')"
                    :prepend-inner-icon="mdiMagnify"
                    :disabled="!goalsStore.goals.filter(g => !g.archive).length"
                    @update:model-value="searchHandler"
                >
                    <template #append-inner>
                        <VProgressCircular
                            v-if="loading"
                            indeterminate
                            size="20"
                            width="3"
                            color="primary"
                        />
                    </template>
                </VTextField>
            </template>

            <v-list
                v-if="tasks.length"
                class="max-h-96"
            >
                <v-list-item
                    v-for="task in tasks"
                    :key="task.id"
                    @click="$router.push({name:'goal-list-tasks-task', params:{ goalId: task.goalId, listId: ALL_TASKS_LIST_ID, taskId: task.id }})"
                >
                    <v-list-item-title>{{ task.description }}</v-list-item-title>
                </v-list-item>
            </v-list>
            <v-list v-else-if="!loading && searchWasCalled">
                <v-list-item 
                    @click="addTaskDialogModel = true"
                >
                    <v-list-item-title>{{ $t('msg.addTask') }} ({{ search }})</v-list-item-title>
                </v-list-item>
            </v-list>
        </VMenu>
        <MainScreenAddTaskDialog 
            v-model="addTaskDialogModel"
            :title="$t('msg.addTaskToUpcoming')"
            :task-name="search"
            upcoming-task
            @added="taskAdded"
            @close="closeAddTaskDialog"
        />
    </div>
</template>

<script lang="ts" setup>
import { mdiMagnify } from '@mdi/js';
import { ref } from 'vue';
import MainScreenAddTaskDialog from '@/components/Screens/MainScreenAddTaskDialog.vue';
import { useTextfieldStyles } from '@/composition/useTextFieldStyles';
import { debounce } from '@/helpers/app-helper';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useGoalsStore } from '@/stores/goals.store';
import { ALL_TASKS_LIST_ID, type TaskItem } from '@/types/tasks.types';
import { useI18n } from 'vue-i18n';

const search = ref('');
const loading = ref(false);
const searchWasCalled = ref(false);
const textFieldStyles = useTextfieldStyles();
const startStore = useBaseScreenStore();
const tasks = ref<TaskItem[]>([]);
const menu = ref(false);
const addTaskDialogModel = ref(false);
const goalsStore = useGoalsStore();
const { t: $t } = useI18n();
const searchHandler = debounce(async () => {
    loading.value = true;
    tasks.value = [];
    if (search.value) {
        tasks.value = await startStore.searchTaskRequest(search.value);
        searchWasCalled.value = true;
        menu.value = true;
    } else {
        searchWasCalled.value = false;
        menu.value = false;
    }
    loading.value = false;
}, 500);

const taskAdded = () => {
    addTaskDialogModel.value = false;
    search.value = '';
    menu.value = false;
};

const closeAddTaskDialog = () => {
    addTaskDialogModel.value = false;
    menu.value = false;
};
</script>