<template>
    <v-card
        class="tv-proj-item mb-3 rad10 pl-3 pr-3 pb-2 pt-2"
        elevation="1"
        :to="{ name: 'goal-list-tasks', params: { goalId: goal.id, listId: ALL_TASKS_LIST_ID } }"
    >
        <v-card-title class="pl-0 pt-0">
            {{ goal.name }}
        </v-card-title>
        <v-card-subtitle class="pl-0">
            {{ goal.description }}
        </v-card-subtitle>
        <div class="tv-proj-item__actions d-flex">
            <div class="tv-proj-item__left flex-grow-1">
                <v-icon
                    v-if="userId !== goal.owner"
                    color="var(--icon-grey)"
                >
                    {{ mdiShareVariantOutline }}
                </v-icon>
            </div>
            <div class="tv-proj-item__right">
                <v-icon color="var(--icon-grey-active)">
                    {{ mdiChevronRight }}
                </v-icon>
            </div>
        </div>
    </v-card>
</template>

<script setup lang="ts">
import { mdiChevronRight, mdiShareVariantOutline } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';

defineProps<{ goal: GoalItem; userId?: number }>();
</script>
