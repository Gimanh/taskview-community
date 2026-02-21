<template>
    <div class="projects-users-desktop d-flex flex-wrap ga-2 pa-3">
        <template
            v-for="(arr, index) in columns"
            :key="index"
        >
            <div class="d-flex flex-column ga-2 projects-users-desktop__column">
                <template
                    v-for="userData in arr"
                    :key="userData.id"
                >
                    <GoalUsersIDesktopItem
                        v-if="canManage(userData.id)"
                        :users="userData"
                        :user-id="tokenData?.userData.id"
                    />
                </template>
            </div>
        </template>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import GoalUsersIDesktopItem from '@/components/Screens/components/ProjectUsers/components/GoalUsersIDesktopItem.vue';
import type { JWTPayload } from '@/helpers/AppTypes';
import { parseJwt } from '@/helpers/Helper';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useGoalsStore } from '@/stores/goals.store';
import { useUserStore } from '@/stores/user.store';
import type { BaseScreenState } from '@/types/base-screen.types';
import { AllGoalPermissions } from '@/types/goals.types';

const userStore = useUserStore();
const tokenData = parseJwt<JWTPayload>(userStore.accessToken);
const baseScreenStore = useBaseScreenStore();
const goalsStore = useGoalsStore();

const distributeItems = (itemsArray: BaseScreenState['users']) => {
    const columns: BaseScreenState['users'][] = [[], [], []];

    itemsArray.forEach((item, index) => {
        columns[index % 3].push(item);
    });

    return columns;
};

const columns = computed(() => distributeItems(baseScreenStore.users));

function canManage(id: number) {
    const g = goalsStore.goals.find((g) => g.id === id);
    if (g) {
        return !!g.permissions[AllGoalPermissions.GOAL_CAN_MANAGE_USERS];
    }
    return false;
}
</script>

<style scoped lang="scss">
.projects-users-desktop {
    height: calc(100vh - calc(var(--v-header-height)/2));
    display: grid !important;
    grid-template-columns: 1fr 1fr 1fr; /* Три колонки одинаковой ширины */
    gap: 10px; /* Промежуток между колонками */
    grid-auto-rows: minmax(100px, auto); /* Фиксированная минимальная высота строки */
    background: var(--user-collab-page-bg);
    &__column {
        max-width: 1fr;
    }
}
</style>
