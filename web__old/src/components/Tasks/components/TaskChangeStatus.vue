<template>
    <div class="tv-assignee">
        <v-select
            v-model="model"
            :loading="loading"
            :disabled="loading"
            :items="statuses"
            :placeholder="t('msg.status')"
            clearable
            class="rad10-v-field pa-0"
            hide-details
            variant="solo"
            item-title="name"
            item-value="id"
            @update:model-value="updateListOnTheServer"
        >
            <template #prepend-inner>
                <div class="flex items-center h-full">
                    <v-icon>
                        {{ APP_ICONS.kanban }}
                    </v-icon>
                </div>
            </template>
            <template #append-item>
                <v-divider class="mb-2" />
                
                <v-list-item class="p-0">
                    <v-text-field
                        v-model="statusName"
                        :prepend-inner-icon="APP_ICONS.add"
                        :placeholder="t('msg.listName')"
                        :loading="loading"
                        :disabled="loading"
                        density="compact"
                        class="w100"
                        variant="solo"
                        hide-details
                        spellcheck="false"
                        @keyup.enter="addStatus"
                    >
                        <template #append-inner>
                            <v-btn
                                size="small"
                                elevation="1"
                                @click="addStatus"
                            >
                                {{ t('msg.add') }}
                            </v-btn>
                        </template>
                    </v-text-field>
                </v-list-item>
            </template>
        </v-select>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { APP_ICONS } from '@/helpers/app-helper';
import { useKanbanStore } from '@/stores/kanban.store';
import { useTasksStore } from '@/stores/tasks.store';
import { DEFAULT_ID } from '@/types/app.types';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem }>();

const kanbanStore = useKanbanStore();
const tasksStore = useTasksStore();
const model = ref<number | null>(props.task.statusId);
const loading = ref(false);
const { t } = useI18n();
const statusName = ref('');

const statuses = computed(() => {
    return kanbanStore.statuses.map((s) => ({ ...s, name: t(s.name) })).filter((s) => s.id !== DEFAULT_ID);
});

const updateListOnTheServer = async () => {
    await tasksStore.updateTaskStatusId({
        id: +props.task.id,
        statusId: model.value || null,
    });
    model.value = props.task.statusId;
};

const addStatus = async () => {
    if (!statusName.value.trim()) return;
    kanbanStore.addStatus({ goalId: props.task.goalId, name: statusName.value });
    statusName.value = '';
};
</script>