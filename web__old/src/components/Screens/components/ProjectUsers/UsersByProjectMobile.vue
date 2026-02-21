<template>
    <BasePageDialog
        v-model="dialog"
        persistent
        @back="$router.push({ name: 'user' })"
    >
        <template #header>
            {{ $t('admin.users') }}
        </template>

        <div class="pa-4">
            <GoalUsersIMobileItem
                v-for="users in baseScreenStore.users"
                :key="users.id"
                :users="users"
                :user-id="tokenData?.userData.id"
            />
        </div>
    </BasePageDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BasePageDialog from '@/components/Screens/BasePageDialog.vue';
import GoalUsersIMobileItem from '@/components/Screens/components/ProjectUsers/components/GoalUsersIMobileItem.vue';
import type { JWTPayload } from '@/helpers/AppTypes';
import { parseJwt } from '@/helpers/Helper';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useUserStore } from '@/stores/user.store';
import { useI18n } from 'vue-i18n';

const baseScreenStore = useBaseScreenStore();
const userStore = useUserStore();
const tokenData = parseJwt<JWTPayload>(userStore.accessToken);
const dialog = ref(true);
const $t = useI18n().t;
</script>
