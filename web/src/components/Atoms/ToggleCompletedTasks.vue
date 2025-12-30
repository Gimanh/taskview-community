<template>
    <v-btn
        v-if="onlyIcon"
        :disabled="tasksStore.loading"
        icon
        size="small"
        elevation="0"
        :loading="tasksStore.loading"
        @click="toggleTasks"
    >
        <v-icon size="large">
            {{ icon }}
        </v-icon>
    </v-btn>
    <v-btn
        v-else
        :prepend-icon="icon"
        variant="text"
        elevation="0"
        class="w100"
        @click="toggleTasks"
    >
        {{ tasksStore.fetchRules.showCompleted ? $t('msg.hideCompletedTasks') : $t('msg.showCompletedTasks') }}
    </v-btn>
</template>

<script setup lang="ts">
import { mdiCheckboxMultipleBlankOutline, mdiCheckboxMultipleMarked } from '@mdi/js';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { delay } from '@/helpers/app-helper';
import { useTasksStore } from '@/stores/tasks.store';
import { useI18n } from 'vue-i18n';

defineProps<{ onlyIcon?: boolean }>();
const route = useRoute();
const tasksStore = useTasksStore();
const listId = computed<string>(() => route.params.listId as string);
const goalId = computed<string>(() => route.params.goalId as string);
const icon = computed(() =>
    tasksStore.fetchRules.showCompleted === 1 ? mdiCheckboxMultipleBlankOutline : mdiCheckboxMultipleMarked
);
const $t = useI18n().t;
async function toggleTasks() {
    if (!tasksStore.loading) {
        tasksStore.resetTasks();
        tasksStore.updateFetchRules({
            showCompleted: tasksStore.fetchRules.showCompleted ? 0 : 1,
            currentListId: +listId.value,
            goalId: +goalId.value,
            currentPage: 0,
        });
        await tasksStore.fetchTasks();
        await delay(200);
    }
}
</script>
