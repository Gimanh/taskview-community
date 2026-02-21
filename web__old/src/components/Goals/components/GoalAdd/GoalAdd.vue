<template>
    <v-text-field
        v-model="projectName"
        :loading="loading"
        :placeholder="$t('msg.projectName')"
        :append-inner-icon="inputIcon"
        variant="solo"
        hide-details
        enterkeyhint="go"
        class="rad10-v-field goal-add-field"
        density="comfortable"
        spellcheck="false"
        @keyup.enter="addGoal"
        @click:append-inner="addGoal"
    />
</template>

<script setup lang="ts">
import { mdiKeyboardReturn, mdiKeyboardVariant } from '@mdi/js';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGoalsStore } from '@/stores/goals.store';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const storage = useGoalsStore();
const projectName = ref('');
const loading = ref(false);

const inputIcon = computed(() => (projectName.value.trim() ? mdiKeyboardReturn : mdiKeyboardVariant));
const { t: $t } = useI18n();
async function addGoal() {
    if (loading.value) {
        return false;
    }
    if (projectName.value.trim()) {
        loading.value = true;
        const result = await storage.addGoal({ name: projectName.value });

        if (result) {
            router.push({
                name: 'goal-list-tasks',
                params: { goalId: storage.goals[0].id, listId: ALL_TASKS_LIST_ID },
            });
        }

        loading.value = false;
        if (result) {
            projectName.value = '';
        }
    }
    return true;
}
</script>

<style lang="scss">
.goal-add-field {
    .v-field__overlay {
        background: linear-gradient(to right, rgb(79, 70, 229), rgb(124, 58, 237));
        opacity: 0.9;
    }
    .v-field__input {
        color: white;
        font-weight: 600;
    }
    .v-field__input::placeholder {
        color: white;
        opacity: .8;
    }
}
</style>
