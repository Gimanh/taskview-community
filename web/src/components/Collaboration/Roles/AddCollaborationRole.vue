<template>
    <v-text-field
        v-if="goalsStore.amIOwner"
        v-model="roleName"
        :label="$t('clb.addRole')"
        :placeholder="$t('clb.addRole')"
        :prepend-inner-icon="mdiPlus"
        :error-messages="error ? [$t('clb.enterRoleName')] : undefined"
        class="h56 fz16 rad10-v-field"
        variant="solo"
        hide-details
        spellcheck="false"
        @click:append-inner="addRole"
        @keyup.enter="addRole"
        @update:model-value="error = false"
    />
</template>

<script setup lang="ts">
import { mdiPlus } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { ref } from 'vue';
import { useCollaborationRolesStore } from '@/stores/collaboration-roles.store';
import { useGoalsStore } from '@/stores/goals.store';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ goalId: GoalItem['id'] }>();
const store = useCollaborationRolesStore();
const goalsStore = useGoalsStore();
const { t: $t } = useI18n();
const roleName = ref('');
const error = ref(false);

async function addRole() {
    if (roleName.value) {
        error.value = false;
        await store.addCollaborationRole({ goalId: props.goalId, roleName: roleName.value });
        roleName.value = '';
    } else {
        error.value = true;
    }
}
</script>
