<template>
    <BasePageDialog
        v-model="dialog"
        :show-header="true"
        :hide-actions="true"
        :width="'80%'"
        :height="'100%'"
        persistent
        class="tv-clb-dsk"
        @back="goBack"
    >
        <template #header>
            <div class="tv-text-h3 txt-center">
                {{ $t('msg.collaboration') }}
            </div>
        </template>
        <div class="pa-3 d-flex ga-2 tv-clb-dsk__body justify-center">
            <div class="tv-clb-dsk__column pa-1 pt-0 d-flex flex-column ga-2 align-content-start">
                <div class="tv-clb-dsk__column-header">
                    <div class="tv-text-h3 mb-1">
                        {{ $t('admin.users') }}
                    </div>
                    <InviteUserToProject
                        :goal-id="goalId"
                        class="flex-grow-0"
                    />
                </div>
                <InvitedUsersIntoProject :goal-id="goalId" />
            </div>
            <div
                v-if="goalsStore.amIOwner"
                class="tv-clb-dsk__column pa-1 pt-0 d-flex flex-column ga-2 align-content-start"
            >
                <div class="tv-clb-dsk__column-header">
                    <div class="tv-text-h3 mb-1">
                        {{ $t('clb.roles') }}
                    </div>
                    <AddCollaborationRole :goal-id="goalId" />
                </div>

                <ListCollaborationRoles :goal-id="goalId" />
            </div>
        </div>
    </BasePageDialog>
</template>

<script  setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import InvitedUsersIntoProject from '@/components/Collaboration/InvitedUsersIntoProject.vue';
import InviteUserToProject from '@/components/Collaboration/InviteUserToProject.vue';
import AddCollaborationRole from '@/components/Collaboration/Roles/AddCollaborationRole.vue';
import ListCollaborationRoles from '@/components/Collaboration/Roles/ListCollaborationRoles.vue';
import BasePageDialog from '@/components/Screens/BasePageDialog.vue';
import { useGoalsStore } from '@/stores/goals.store';
import { useI18n } from 'vue-i18n';

defineProps<{ goalId: number }>();

const dialog = ref(true);
const goalsStore = useGoalsStore();
const router = useRouter();
const { t: $t } = useI18n();
const goBack = async () => {
    dialog.value = false;
    await router.back();
};
</script>
