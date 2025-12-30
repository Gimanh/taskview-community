<template>
    <v-card
        class="rad10 d-flex align-center pb-2 pt-2 pl-3 pr-3"
        :variant="isActive ? 'tonal' : undefined"
        @click="goToLists"
    >
        <div class="flex-grow-1 txt-only-two-lines txt-subtitle-2 txt-opacity">
            {{ goal.name }}
        </div>
        <div class="d-flex align-center ga-2">
            <v-icon
                v-if="userStore.payloadData?.id !== goal.owner"
                :color="ICON_PROJECT.color"
                size="x-small"
            >
                {{ mdiShareVariantOutline }}
            </v-icon>
            <GoalItemActions :goal="goal" />
        </div>
    </v-card>
</template>

<script lang="ts" setup>
import { mdiShareVariantOutline } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GoalItemActions from '@/components/Goals/components/GoalItemActions.vue';
import { useUserStore } from '@/stores/user.store';
import { ICON_PROJECT } from '@/types/base-screen.types';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';

const props = defineProps<{ goal: GoalItem }>();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isActive = computed(() => route.params.goalId === props.goal.id.toString());

function goToLists() {
    router.push({
        name: 'goal-list-tasks',
        params: { goalId: props.goal.id, listId: ALL_TASKS_LIST_ID },
    });
}
</script>
