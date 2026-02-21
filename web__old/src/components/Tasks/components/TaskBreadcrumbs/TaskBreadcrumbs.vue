<template>
    <div
        :class="{[styles.container]:true}"
    >
        <div
            :class="styles.item"
            class="dark:hover:bg-gray-700"
            @click="redirectToGoal"
        >
            {{ maxText(goalName) }}
        </div>
        <span :class="styles.divider">
            /
        </span>
        <div
            :class="{[styles.item]:true, [styles.active]:listIsActive}"
            class="dark:hover:bg-gray-700"
            @click="redirectToList"
        >
            {{ maxText(listName) }}
        </div>
    </div>
</template>
<script setup lang="ts">
import type { GoalItem, GoalListItem } from 'taskview-api';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { APP_ROUTES } from '@/helpers/app-helper';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useGoalsStore } from '@/stores/goals.store';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';
import styles from './TaskBreadcrumbs.module.scss';

const props = defineProps<{ goalId: GoalItem['id']; listId: GoalListItem['id'] }>();

const router = useRouter();
const goalsStore = useGoalsStore();
const goalListStore = useGoalListsStore();
const { t } = useI18n();

const goalName = computed(() => goalsStore.selectedGoal?.name || '');
const listName = computed(() => {
    if (props.listId === ALL_TASKS_LIST_ID) {
        return t('msg.allTasks');
    }
    return goalListStore.lists.find((l) => l.id === props.listId)?.name || '';
});

const redirectToGoal = async () => {
    if (goalsStore.selectedGoal?.id) {
        await router.push(APP_ROUTES.goalList(goalsStore.selectedGoal?.id));
    }
};

const redirectToList = async () => {
    if (goalsStore.selectedGoal?.id) {
        await router.push(APP_ROUTES.goalList(goalsStore.selectedGoal?.id, props.listId));
    }
};

const listIsActive = computed(
    () =>
        +router.currentRoute.value.params.listId === props.listId &&
        router.currentRoute.value.name === 'goal-list-tasks'
);

const maxText = (string: string) => (string.length > 7 ? `${string.slice(0, 7)}…` : string);
</script>