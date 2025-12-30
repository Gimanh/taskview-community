<template>
    <div class="d-flex flex-column ga-2">
        <template
            v-for="user in collaborationStore.users"
            :key="user.id"
        >
            <InvitedUsersItem
                v-if="!user.goalOwner"
                :goal-id="goalId"
                :user="user"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import type { GoalItem } from 'taskview-api';
import { useCollaborationStore } from '@/stores/collaboration.store';
import InvitedUsersItem from './InvitedUsersItem.vue';

defineProps<{ goalId: GoalItem['id'] }>();
defineEmits<(e: 'userSelected', email: string) => void>();

const collaborationStore = useCollaborationStore();
</script>
