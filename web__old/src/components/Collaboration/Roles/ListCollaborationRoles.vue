<template>
    <div v-if="goalsStore.amIOwner">
        <template
            v-for="role in store.roles"
            :key="role.id"
        >
            <ItemWithAvatar
                :title="role.name"
                :loading="loading"
                :is-active="isActive === role.id"
                class="w100"
                @click="toggle(role.id)"
            >
                <template #avatar>
                    <v-icon
                        class="tv-icon-grey"
                        :icon="mdiBadgeAccountHorizontalOutline"
                    />
                </template>

                <template #action>
                    <v-btn
                        v-if="goalsStore.amIOwner"
                        size="small"
                        variant="flat"
                        icon
                        @click.stop="deleteRole(role.id)"
                    >
                        <v-icon
                            :icon="mdiDeleteOutline"
                            color="red"
                            size="large"
                        />
                    </v-btn>
                </template>
            </ItemWithAvatar>
            <div
                v-if="isActive === role.id"
                class="pl-5 d-flex flex-column ga-2"
            >
                <template
                    v-for="(permissions, group) in permissionsStore.groupedPermissions"
                    :key="group"
                >
                    <v-card class="rad10">
                        <v-card-title>
                            {{ PermissionGroups[group][locale as 'ru' | 'en'] }}
                        </v-card-title>
                    </v-card>
                    <div class="pl-5 d-flex flex-column ga-2">
                        <v-card
                            v-for="perm in permissions"
                            :key="perm.id"
                            class="d-flex rad10 pa-2"
                            :disabled="loading || !goalsStore.amIOwner"
                            @click="togglePermission(role.id, perm.id)"
                        >
                            <v-checkbox-btn
                                :model-value="store.rolesPermissions[role.id] && store.rolesPermissions[role.id][perm.id]"
                                :disabled="!goalsStore.amIOwner"
                                class="align-self-start"
                            />
                            <div class="pt-2 w100">
                                {{
                                    JSON.parse(perm.description_locales)[locale]
                                        ? JSON.parse(perm.description_locales)[locale]
                                        : JSON.parse(perm.description_locales)['en']
                                }}
                            </div>
                        </v-card>
                    </div>
                </template>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { mdiBadgeAccountHorizontalOutline, mdiDeleteOutline } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { ref } from 'vue';
import ItemWithAvatar from '@/components/ItemWithAvatar.vue';
import { useCollaborationPermissionsStore } from '@/stores/collaboration-permissions.store';
import { useCollaborationRolesStore } from '@/stores/collaboration-roles.store';
import { useGoalsStore } from '@/stores/goals.store';
import { PermissionGroups } from '@/types/collaboration-permissions.types';
import type { CollaborationRole } from '@/types/collaboration-roles.types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ goalId: GoalItem['id'] }>();
const store = useCollaborationRolesStore();
const permissionsStore = useCollaborationPermissionsStore();
const goalsStore = useGoalsStore();
const isActive = ref(-1);
const loading = ref(false);
const { locale } = useI18n();
async function deleteRole(id: CollaborationRole['id']) {
    const answer = confirm('Delete role from collaboration?');
    if (answer) {
        await store.deleteCollaborationRole({ id, goalId: props.goalId });
    }
}

async function togglePermission(roleId: number, permissionId: number) {
    loading.value = true;
    await store.togglePermissionForRole({ roleId, permissionId });
    loading.value = false;
}

function toggle(roleId: number) {
    if (isActive.value === roleId) {
        isActive.value = -1;
    } else {
        isActive.value = roleId;
    }
}
</script>
