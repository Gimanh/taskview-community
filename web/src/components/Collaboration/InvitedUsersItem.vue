<template>
    <ItemWithAvatar
        :title="user.email"
        :is-active="isActive === user.id"
        :avatar="user.email.slice(0, 2).toLocaleUpperCase()"
        :avatar-color="getColor(user.id)"
        @toggle-active="toggle(user.id)"
    >
        <v-card elevation="0">
            <v-card-text class="pl-2 pr-2">
                <v-chip-group
                    v-model="models.roles"
                    column
                    multiple
                    selected-class="text-primary"
                >
                    <v-chip
                        v-for="rl in rolesStore.roles"
                        :key="rl.id"
                        :text="rl.name"
                        :value="rl.id"
                        label
                        class="rounded"
                        filter
                    />
                </v-chip-group>
            </v-card-text>
            <v-card-actions class="pt-0 pb-0">
                <v-btn
                    size="small"
                    color="red"
                    icon
                    @click="deleteUser"
                >
                    <v-icon
                        :icon="mdiDeleteOutline"
                        size="large"
                    />
                </v-btn>
                <v-spacer />
                <v-btn
                    size="small"
                    icon
                    @click="cancel"
                >
                    <v-icon
                        :icon="mdiClose"
                        size="large"
                    />
                </v-btn>
                <v-btn
                    :disabled="!hasChanges"
                    size="small"
                    icon
                    @click="toggleRoleForUser"
                >
                    <v-icon
                        :icon="mdiContentSaveOutline"
                        size="large"
                    />
                </v-btn>
            </v-card-actions>
        </v-card>
    </ItemWithAvatar>
</template>

<script setup lang="ts">
import { mdiClose, mdiContentSaveOutline, mdiDeleteOutline } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { reactive, ref, watchEffect } from 'vue';
import ItemWithAvatar from '@/components/ItemWithAvatar.vue';
import { getPasteleColor } from '@/helpers/app-helper';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useCollaborationRolesStore } from '@/stores/collaboration-roles.store';
import type { CollaborationUsers } from '@/types/collaboration.types';

const props = defineProps<{ goalId: GoalItem['id']; user: CollaborationUsers[number] }>();
defineEmits<(e: 'userSelected', email: string) => void>();

const isActive = ref(-1);
const colors: Record<number, string> = {};
const hasChanges = ref(false);

const collaborationStore = useCollaborationStore();
const rolesStore = useCollaborationRolesStore();

const models = reactive<{ roles: CollaborationUsers[number]['roles'] }>({
    roles: [...(props.user.roles ?? [])],
});

watchEffect(() => {
    hasChanges.value = JSON.stringify(models.roles.sort()) !== JSON.stringify((props.user.roles ?? []).sort());
});

function toggle(id: number) {
    if (isActive.value === id) {
        isActive.value = -1;
    } else {
        isActive.value = id;
    }
}

function getColor(id: number) {
    if (!colors[id]) {
        colors[id] = getPasteleColor();
    }
    return colors[id];
}

function cancel() {
    models.roles = [...props.user.roles];
    isActive.value = -1;
}

async function deleteUser() {
    const answer = confirm('Delete user from collaboration?');
    if (answer) {
        await collaborationStore.deleteUserFromCollaboration({ id: props.user.id, goalId: props.goalId });
    }
}

async function toggleRoleForUser() {
    await collaborationStore.toggleUserRole({ userId: props.user.id, roles: models.roles, goalId: props.goalId });
    await collaborationStore.fetchCollaborationUsersForGoal(props.goalId);
}
</script>
