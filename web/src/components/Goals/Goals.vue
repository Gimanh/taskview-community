<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div class="goals-container d-flex flex-column ga-2 pt-3 pl-3">
        <GoalAdd />
        <template
            v-for="item in storage.goals"
            :key="item.id"
        >
            <GoalsItem
                v-if="item.archive === 0"
                :goal="item"
            />
        </template>
    </div>
</template>

<script async setup lang="ts">
import GoalAdd from '@/components/Goals/components/GoalAdd/GoalAdd.vue';
import GoalsItem from '@/components/Goals/components/GoalsItem/GoalsItem.vue';
import { useGoalsStore } from '@/stores/goals.store';

const storage = useGoalsStore();

await storage.fetchGoals();
</script>
