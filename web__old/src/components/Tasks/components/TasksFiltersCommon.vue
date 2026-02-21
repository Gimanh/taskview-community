<template>
    <div>
        <v-bottom-sheet
            v-model="isActiveSheet"
            content-class="tv-justify-self-center"
            scrollable
            inset
            class="tv-filters-bottom-sheet"
        >
            <template #activator="{ props: activatorProps }">
                <slot
                    name="activator"
                    v-bind="activatorProps"
                />
            </template>

            <v-card
                class="rounded-lg pt-3"
                style="background: rgb(var(--v-theme-background))"
            >
                <v-card-title>
                    {{ $t('sortN.filter') }}
                </v-card-title>

                <v-card-text class="pl-3 pr-3 d-flex flex-column ga-5">
                    <slot name="prepend" />
                    <!-- {{ filterTasksBy }} -->
                    <v-select
                        v-model="filterTasksBy['selectedUser']"
                        :items="collabStore.users"
                        :label="$t('admin.users')"
                        item-title="email"
                        item-value="id"
                        variant="solo"
                        class="rad10-v-field"
                        hide-details
                        clearable
                    />

                    <v-card
                        elevation="2"
                        class="rad10 flex-shrink-0"
                    >
                        <v-card-subtitle class="txt-subtitle-2 pt-2">
                            {{ $t('msg.priority') }}
                        </v-card-subtitle>
                        <div class="d-flex justify-space-around flex-col">
                            <TaskPriorityUi
                                v-model="filterTasksBy['priority'] as Task['priorityId'] | undefined"
                                elevation="0"
                            />
                            <v-btn @click="resetPriority">
                                {{ $t('msg.reset') }}
                            </v-btn>
                        </div>
                    </v-card>

                    <v-card
                        elevation="2"
                        class="rad10 flex-shrink-0"
                    >
                        <v-card-subtitle class="txt-subtitle-2 pt-2">
                            {{ $t('msg.tags') }}
                        </v-card-subtitle>
                        <div class="d-flex flex-wrap mb-2">
                            <v-chip
                                v-for="item in filteredTags"
                                :key="item.id"
                                :prepend-icon="mdiLabelOutline"
                                :text="item.name"
                                :color="
                                    filterTasksBy['selectedTags'] && filterTasksBy['selectedTags'][item.id]
                                        ? item.color
                                        : '#ccc'
                                "
                                class="ma-2"
                                label
                                @click="handleTag(item)"
                            />
                        </div>
                    </v-card>

                    <slot name="append" />
                </v-card-text>

                <v-divider />

                <v-card-actions>
                    <v-btn @click="resetState">
                        {{ $t('msg.reset') }}
                    </v-btn>
                    <v-spacer />

                    <v-btn @click="isActiveSheet = false">
                        {{ $t('msg.close') }}
                    </v-btn>
                    <!-- <v-spacer /> -->
                </v-card-actions>
            </v-card>
        </v-bottom-sheet>
    </div>
</template>

<script setup lang="ts">
import { mdiLabelOutline } from '@mdi/js';
import type { Task, TaskFilters } from 'taskview-api';
import { computed, reactive, ref, watch } from 'vue';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useTagsStore } from '@/stores/tag.store';
import type { TagItem } from '@/types/tags.types';
import TaskPriorityUi from './TaskPriorityUi.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<TaskFilters & { goalId: number }>();
const emits = defineEmits<(e: 'updatedFilters', data: TaskFilters) => void>();
const $t = useI18n().t;
const tagsStore = useTagsStore();
const goalListStore = useGoalListsStore();
const collabStore = useCollaborationStore();

const isActiveSheet = ref(false);

const filterTasksBy = reactive<TaskFilters>({
    selectedUser: props.selectedUser,
    priority: props.priority,
    selectedTags: props.selectedTags,
});

collabStore.fetchCollaborationUsersForGoal(goalListStore.currentGoalId);

const filteredTags = computed(() => {
    const result = tagsStore.tags.filter((t) => {
        if (props.goalId) {
            if (t.goalId === props.goalId || t.goalId === null) {
                return true;
            }
            return false;
        }
        return true;
    });

    return result;
});

watch(
    () => filterTasksBy,
    () => {
        emits('updatedFilters', {
            ...filterTasksBy,
            //vuetify by default set null
            selectedUser: filterTasksBy.selectedUser === null ? undefined : filterTasksBy.selectedUser,
        });
    },
    { deep: true }
);

function resetPriority() {
    filterTasksBy.priority = undefined;
}

function handleTag(tag: TagItem) {
    if (!filterTasksBy.selectedTags) {
        filterTasksBy.selectedTags = {};
    }
    if (filterTasksBy.selectedTags[tag.id]) {
        delete filterTasksBy.selectedTags[tag.id];
    } else {
        filterTasksBy.selectedTags[tag.id] = true;
    }
}

function resetState() {
    filterTasksBy.selectedTags = undefined;
    filterTasksBy.priority = undefined;
    filterTasksBy.selectedUser = undefined;
}
</script>
