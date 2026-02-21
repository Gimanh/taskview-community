<template>
    <div>
        <v-btn
            v-if="route.params.goalId"
            :color="isActiveButton(graphRoute) ? COLOR_TV_MAIN : undefined"
            :icon="APP_ICONS.graph"
            @click="redirectToGraph"
        />

        <v-btn
            v-if="route.params.goalId"
            :color="isActiveButton(kanbanRoute) ? COLOR_TV_MAIN : undefined"
            :icon="APP_ICONS.kanban"
            @click="redirectToKanban"
        />

        <v-btn
            v-if="route.params.goalId"
            :color="isActiveButton(collaborationRoute) ? COLOR_TV_MAIN : undefined"
            :icon="APP_ICONS.collaboration"
            @click="redirectToCollaboration"
        />

        <v-btn
            v-if="route.params.goalId"
            :color="isActiveButton(allTasksRoute) ? COLOR_TV_MAIN : undefined"
            :icon="APP_ICONS.tasks"
            @click="redirectToAllTasks"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { type RouteLocationRaw, useRoute, useRouter } from 'vue-router';
import { APP_ICONS, COLOR_TV_MAIN } from '@/helpers/app-helper';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';

const router = useRouter();
const route = useRoute();
const collaborationRoute = computed(() => ({
    name: 'project-collaboration-page',
    param: { goalId: route.params.goalId },
}));
const kanbanRoute = computed(() => ({ name: 'kanban', param: { goalId: route.params.goalId } }));
const allTasksRoute = computed(() => ({ name: 'goal-list-tasks', params: { listId: ALL_TASKS_LIST_ID } }));
const graphRoute = computed(() => ({ name: 'user-graph', params: { goalId: route.params.goalId } }));

const redirectToKanban = () => router.push(kanbanRoute.value);
const redirectToCollaboration = () => router.push(collaborationRoute.value);
const redirectToAllTasks = () => router.push(allTasksRoute.value);
const redirectToGraph = () => router.push(graphRoute.value);

function isActiveButton(to: RouteLocationRaw): boolean {
    if (typeof to === 'object' && 'name' in to && route.name) {
        return to.name === route.name;
    }
    return false;
}
</script>