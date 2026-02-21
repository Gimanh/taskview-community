<template>
    <div style="display: flex; flex-grow: 1">
        <MobileHeaderUserPage v-if="routeLocation === 'user'" />
        <MobileHeaderTask v-if="routeLocation === 'tasks'" />

        <div
            v-if="routeLocation === 'lists'"
            style="flex-grow: 1"
        >
            <div class="mr-3">
                <GoalListAdd
                    :goal-id="goalId"
                    :density="'compact'"
                    :variant="'solo-filled'"
                    flat
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { GoalListAdd } from '@/components/GoalLists/components/GoalListAdd';
import MobileHeaderUserPage from '@/components/Screens/MobileHeaderUserPage.vue';
import MobileHeaderTask from '@/components/Tasks/components/MobileHeaderTask.vue';
import { useRouteLocation } from '@/composition/useRouteLocation';

const routeLocation = useRouteLocation();
const route = useRoute();
const goalId = computed(() => +route.params.goalId);
</script>
