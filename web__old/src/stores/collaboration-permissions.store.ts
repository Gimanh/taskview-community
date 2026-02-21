import { defineStore } from 'pinia';
import { $tvApi } from '@/plugins/axios';
import type { CollaborationPermissionsState, PermissioinGroupsIds } from '@/types/collaboration-permissions.types';

export const useCollaborationPermissionsStore = defineStore('collaboration-permissions', {
    state(): CollaborationPermissionsState {
        return {
            permissions: [],
        };
    },
    getters: {
        groupedPermissions(state): Record<PermissioinGroupsIds, CollaborationPermissionsState['permissions']> {
            const map = new Map<PermissioinGroupsIds, CollaborationPermissionsState['permissions']>();
            state.permissions.forEach((perm) => {
                const arr = map.get(perm.permission_group);
                if (!arr) {
                    map.set(perm.permission_group, [perm]);
                } else {
                    arr.push(perm);
                }
            });

            return Object.fromEntries(map) as Record<
                PermissioinGroupsIds,
                CollaborationPermissionsState['permissions']
            >;
        },
    },
    actions: {
        async fetchAllPermissions(): Promise<void> {
            const result = await $tvApi.collaboration.fetchAllPermissions().catch((err) => console.log(err));
            if (!result) return;
            this.permissions = result;
        },
    },
});
