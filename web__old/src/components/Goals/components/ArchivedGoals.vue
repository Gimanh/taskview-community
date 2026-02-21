<template>
    <div class="goals-container d-flex flex-column ga-2 pt-3 pl-3">
        <template
            v-for="item in archivedGoals"
            :key="item.id"
        >
            <GoalsItem :goal="item" />
        </template>
    </div>
</template>
<script setup lang="ts">
import type { GoalItem } from 'taskview-api';
import { computed } from 'vue';
import { GoalsItem } from '@/components/Goals/components/GoalsItem';
import { useGoalsStore } from '@/stores/goals.store';

const storage = useGoalsStore();

const archivedGoals = computed(() => storage.goals.filter((g: GoalItem) => g.archive === 1));
</script>
