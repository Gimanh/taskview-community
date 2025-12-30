<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div
        class="pa-2 d-flex flex-column ga-2"
        style="position: relative"
    >
        <TasksFilterBar />
        <TaskSearchAdd
            v-if="canAddTask"
            v-show="canShowAddTask"
            :list-id="+listId"
            style="position: sticky; top: 0px; z-index: 2"
        />
        <v-progress-linear
            v-if="storage.loading"
            absolute
            color="green"
            indeterminate
        />
    </div>
    <div
        ref="taskContainer"
        class="tv-task-container"
    >
        <v-pull-to-refresh
            :pull-down-threshold="56"
            class="pa-4 pt-2"
            @load="reloadTasks"
        >
            <template v-if="canViewTasks">
                <!-- <AnimatePresence> -->
                <template
                    v-for="(item, index) in storage.tasks"
                    :key="item.id"
                >
                    <TaskItemMain
                        v-if="item"
                        :task="item"
                        :index="index"
                    />
                </template>
                <!-- </AnimatePresence> -->
            </template>
            
            <div
                v-if="storage.tasks.length === 0 && !storage.loading"
                class="rad10 text-center"
            >
                {{ t('msg.tasksNotFound') }}
            </div>
        </v-pull-to-refresh>

        <RouterView :key="$route.fullPath" />
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import TaskItemMain from '@/components/Tasks/components/TaskItemMain.vue';
import TaskSearchAdd from '@/components/Tasks/components/TaskSearchAdd';
import TasksFilterBar from '@/components/Tasks/components/TasksFilterBar.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useTagsStore } from '@/stores/tag.store';
import { useTasksStore } from '@/stores/tasks.store';
import { useI18n } from 'vue-i18n';

const tagsStore = useTagsStore();
const display = useDisplay();
const taskContainer = ref<HTMLElement | null>(null);
const route = useRoute();
const storage = useTasksStore();
const listId = computed<string>(() => route.params.listId as string);
const goalId = computed<string>(() => route.params.goalId as string);
const canShowAddTask = computed(() => !(display.sm.value || display.xs.value));
const { canAddTask, canViewTasks } = useGoalPermissions();
const { t } = useI18n();
async function reloadTasks({ done }: { done: () => void }) {
    storage.resetTasks();

    storage.updateFetchRules({
        endOfTasks: false,
        currentPage: 0,
    });

    await fetchTasksWrap();
    done();
}

watch(
    [listId, goalId],
    async () => {
        resetDefaultState();
        await fetchTasksWrap();
    },
    { immediate: true }
);

function resetDefaultState() {
    storage.$reset();
    //FIXME надо передавать эти параметры в пропсах для тестов
    storage.updateFetchRules({
        currentListId: +listId.value,
        goalId: +route.params.goalId,
    });
}

async function fetchTasksWrap() {
    if (!storage.loading && !storage.fetchRules.endOfTasks) {
        await storage.fetchTasks();
    }
}

async function scrollHandler(event: Event) {
    const target = event.target as HTMLElement;
    const scrollPercentage = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
    if (scrollPercentage > 85 && !storage.fetchRules.endOfTasks) {
        await fetchTasksWrap();
    }
}

onMounted(() => {
    tagsStore.fetchAllTags();
    if (taskContainer.value) {
        taskContainer.value.addEventListener('scroll', scrollHandler);
    }
});

onBeforeUnmount(() => {
    taskContainer.value?.removeEventListener('scroll', scrollHandler);
});
</script>
