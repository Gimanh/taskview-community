<template>
    <CollaborationDialogMob
        v-if="mobile.isMobile.value"
        :goal-id="cmpGoalId"
    />
    <CollaborationDialogDsk
        v-else
        :goal-id="cmpGoalId"
    />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import CollaborationDialogDsk from '@/components/Collaboration/CollaborationDialog/CollaborationDialogDsk.vue';
import CollaborationDialogMob from '@/components/Collaboration/CollaborationDialog/CollaborationDialogMob.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useMobile } from '@/composition/useMobile';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useCollaborationPermissionsStore } from '@/stores/collaboration-permissions.store';
import { useCollaborationRolesStore } from '@/stores/collaboration-roles.store';

defineEmits(['close']);

const route = useRoute();
const cmpGoalId = computed(() => +route.params.goalId);
const mobile = useMobile();
const collaborationStore = useCollaborationStore();
const clbRolesStore = useCollaborationRolesStore();
const permissionsStore = useCollaborationPermissionsStore();
let wasFetched = false;
const { canManageUsers } = useGoalPermissions();

watch(
    canManageUsers, 
    async (permitted) => {
        if (permitted) {
            fetchUsersAndRoles();
        }
    },
    { immediate: true }
);

async function fetchUsersAndRoles() {
    if (!wasFetched) {
        wasFetched = true;
        await collaborationStore.fetchCollaborationUsersForGoal(cmpGoalId.value);
        await clbRolesStore.fetchCollaborationRolesForGoal(cmpGoalId.value);
    }
}

// await permissionsStore.fetchAllPermissions();
// await clbRolesStore.fetchAllRolePermissionsForGoal(cmpGoalId.value);

Promise.allSettled([
    permissionsStore.fetchAllPermissions(),
    clbRolesStore.fetchAllRolePermissionsForGoal(cmpGoalId.value),
]);
</script>
