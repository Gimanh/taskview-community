<template>
    <v-text-field
        v-if="canManageUsers"
        v-model="email"
        :error="error"
        :placeholder="t('clb.inviteUser')"
        :error-messages="error ? t('admin.correctEmail') : undefined"
        :rules="rules"
        autofocus
        validate-on="blur"
        color="primary"
        variant="solo"
        hide-details
        spellcheck="false"
        class="h56 fz16 rad10-v-field"
        @keyup.enter="addUser"
    >
        <template #prepend-inner>
            <v-icon
                class="tv-icon-grey"
                :icon="mdiAccountBoxMultipleOutline"
            />
        </template>

        <template #append-inner>
            <v-btn
                v-if="canAddUser"
                size="small"
                elevation="1"
                @click="addUser"
            >
                {{ t('msg.add') }}
            </v-btn>
        </template>
    </v-text-field>
</template>
<script setup lang="ts">
import { mdiAccountBoxMultipleOutline } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { isEmail } from '@/helpers/Helper';
import { useCollaborationStore } from '@/stores/collaboration.store';

const props = defineProps<{ goalId: GoalItem['id'] }>();
const { t } = useI18n();
const error = ref(false);
const email = ref('');
const rules = computed(() => [(v: string) => (!!v && isEmail(v)) || t('admin.correctEmail')]);
const { canManageUsers } = useGoalPermissions();

const collaborationStore = useCollaborationStore();

const canAddUser = computed(() => isEmail(email.value.trim()));

async function addUser() {
    if (canAddUser.value) {
        const addResult = await collaborationStore
            .addCollaborationUser({
                email: email.value.trim(),
                goalId: props.goalId,
            })
            .catch(() => alert('Can not add user'));
        if (addResult) {
            email.value = '';
        }
    } else {
        error.value = true;
    }
}
</script>
