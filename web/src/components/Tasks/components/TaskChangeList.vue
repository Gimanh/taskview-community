<template>
    <div class="tv-assignee">
        <template v-if="sortedList.length < 8">
            <div class="flex gap-2 flex-wrap shadow-md p-3 rounded-tv10 bg-task-item-bg">
                <VIcon :icon="mdiFormatListBulletedType" />
                <TChip
                    v-for="list in sortedList"
                    :key="list.id"
                    :icon="mdiRadioboxMarked"
                    :active="model === list.id"
                    :text="list.name"
                    @click="selectList(list.id)"
                />
                <v-text-field
                    v-model="listName"
                    :prepend-inner-icon="APP_ICONS.add"
                    :placeholder="$t('msg.listName')"
                    :loading="loading"
                    :disabled="loading"
                    density="comfortable"
                    class="w100 rad10-v-field"
                    variant="solo"
                    hide-details
                    spellcheck="false"
                    @keyup.enter="addNewList"
                >
                    <template #append-inner>
                        <v-btn
                            size="small"
                            elevation="0"
                            @click="addNewList"
                        >
                            {{ $t('msg.add') }}
                        </v-btn>
                    </template>
                </v-text-field>
            </div>
        </template>
        
        <v-select
            v-else
            v-model="model"
            :loading="loading"
            :disabled="loading"
            :items="sortedList"
            :placeholder="$t('msg.list')"
            clearable
            class="rad10-v-field pa-0"
            hide-details
            variant="solo"
            item-title="name"
            item-value="id"
            @update:model-value="updateListOnTheServer"
        >
            <template #prepend-inner>
                <div class="flex items-start pt-4 h-full">
                    <v-icon>
                        {{ mdiFormatListBulletedType }}
                    </v-icon>
                </div>
            </template>

            <template #append-item>
                <v-divider class="mb-2" />
                
                <v-list-item class="p-0">
                    <v-text-field
                        v-model="listName"
                        :prepend-inner-icon="APP_ICONS.add"
                        :placeholder="$t('msg.listName')"
                        :loading="loading"
                        :disabled="loading"
                        density="compact"
                        class="w100"
                        variant="solo"
                        hide-details
                        spellcheck="false"
                        @keyup.enter="addNewList"
                    >
                        <template #append-inner>
                            <v-btn
                                size="small"
                                elevation="1"
                                @click="addNewList"
                            >
                                {{ $t('msg.add') }}
                            </v-btn>
                        </template>
                    </v-text-field>
                </v-list-item>
            </template>
        </v-select>
    </div>
</template>

<script setup lang="ts">
import { mdiFormatListBulletedType, mdiRadioboxMarked } from '@mdi/js';
import { computed, ref } from 'vue';
import TChip from '@/components/tv-ui/TChip.vue';
import { APP_ICONS } from '@/helpers/app-helper';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ task: TaskItem }>();

const goalListStore = useGoalListsStore();
const tasksStore = useTasksStore();
const model = ref<number | null>(props.task.goalListId);
const loading = ref(false);
const listName = ref('');
const $t = useI18n().t;

const sortedList = computed(() =>
    goalListStore.lists.slice().sort((a, b) => {
        if (a.archive !== b.archive) {
            return a.archive - b.archive;
        }

        if (a.archive === 0) {
            return b.id - a.id;
        }

        return 0;
    })
);

const selectList = (listId: number) => {
    if (model.value === listId) {
        model.value = null;
    } else {
        model.value = listId;
    }
    updateListOnTheServer();
};

const updateListOnTheServer = async () => {
    await tasksStore.moveTaskToAnotherList({
        id: props.task.id,
        goalListId: model.value || null,
    });
    model.value = props.task.goalListId;
};

const addNewList = async () => {
    if (!props.task.goalId || !listName.value.trim()) {
        return;
    }
    await goalListStore.addList({ goalId: props.task.goalId, name: listName.value });
    listName.value = '';
};
</script>