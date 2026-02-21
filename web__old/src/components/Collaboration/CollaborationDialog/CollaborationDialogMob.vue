<template>
    <BasePageDialog
        v-model="dialog"
        :show-header="true"
        :hide-actions="true"
        @back="redirectBack"
    >
        <template #header>
            <div class="tv-text-h3 txt-center">
                {{ $t('msg.collaboration') }}
            </div>
        </template>
        <div class="pa-3 d-flex flex-column ga-2">
            <div class="tv-text-h3">
                {{ $t('admin.users') }}
            </div>
            <InviteUserToProject :goal-id="goalId" />
            <InvitedUsersIntoProject :goal-id="goalId" />
            <div
                v-if="goalsStore.amIOwner"
                class="tv-text-h3 mt-5"
            >
                {{ $t('clb.roles') }}
            </div>
            <AddCollaborationRole :goal-id="goalId" />
            <ListCollaborationRoles :goal-id="goalId" />
        </div>
    </BasePageDialog>
</template>

<script setup lang="ts">
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
const redirectBack = async () => {
    dialog.value = false;
    await router.back();
};
</script>
