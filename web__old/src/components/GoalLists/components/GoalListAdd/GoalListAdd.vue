<template>
    <v-text-field
        v-if="canAddTaskList"
        v-model="listName"
        :loading="loading"
        :placeholder="t('msg.addList')"
        :append-inner-icon="inputIcon"
        :prepend-inner-icon="mdiPlus"
        variant="solo"
        hide-details
        enterkeyhint="go"
        class="rad10-v-field"
        density="comfortable"
        spellcheck="false"
        @keyup.enter="addList"
        @click:append-inner="addList"
    />
</template>

<script setup lang="ts">
import { mdiKeyboardReturn, mdiKeyboardVariant, mdiPlus } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { computed, ref } from 'vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useI18n } from 'vue-i18n';
const props = defineProps<{ goalId: GoalItem['id'] }>();
const emits = defineEmits(['added']);
const { t } = useI18n();
const storage = useGoalListsStore();
const listName = ref('');
const loading = ref(false);

const { canAddTaskList } = useGoalPermissions();

defineExpose({
    loading,
});

const inputIcon = computed(() => (listName.value.trim() ? mdiKeyboardReturn : mdiKeyboardVariant));

async function addList() {
    if (loading.value) {
        return false;
    }
    if (listName.value.trim()) {
        loading.value = true;
        const result = await storage.addList({
            name: listName.value,
            goalId: +props.goalId,
        });
        loading.value = false;
        if (result) {
            listName.value = '';
        }
    }
    emits('added');
    return true;
}
</script>
