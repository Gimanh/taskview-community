<template>
    <v-card
        class="rad10 d-flex align-center pb-2 pt-2 pl-3 pr-3 shrink-0"
        :variant="isActive ? 'tonal' : undefined"
        @click="goToTasks"
    >
        <div class="flex-grow-1 txt-only-two-lines txt-subtitle-2 txt-opacity">
            {{ list.name }}
        </div>
        <div>
            <v-btn
                icon
                :size="'x-small'"
                variant="text"
                @click.stop.prevent="showActionDialog($event)"
            >
                <v-icon>
                    {{ mdiDotsHorizontal }}
                </v-icon>
            </v-btn>
        </div>
    </v-card>
</template>

<script setup lang="ts">
import { mdiDotsHorizontal } from '@mdi/js';
import type { GoalListItem } from 'taskview-api';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { GoalListEventMoreMenu } from '@/types/goal-lists.types';

const props = defineProps<{ list: GoalListItem }>();
const emits = defineEmits<(e: 'showActions', data: { activator: HTMLElement; list: GoalListItem }) => void>();

const route = useRoute();
const router = useRouter();
const isActive = computed(() => route.params.listId === props.list.id.toString());

function goToTasks() {
    router.push({
        name: 'goal-list-tasks',
        params: { listId: props.list.id },
    });
}

function showActionDialog(ev: Event) {
    const event: GoalListEventMoreMenu = {
        activator: ev.currentTarget as HTMLElement,
        list: props.list,
    };
    emits('showActions', event);
}
</script>
