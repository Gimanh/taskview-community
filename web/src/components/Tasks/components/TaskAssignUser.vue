<template>
    <div
        v-if="canViewAssignedUsersToTask"
        class="tv-assignee"
    >
        <div
            v-if="collabStore.users.length < 8"
            class="flex gap-2 flex-wrap shadow-md p-3 rounded-tv10 bg-task-item-bg"
        > 
            <VIcon :icon="mdiAccountBoxMultipleOutline" />
            <TChip
                v-for="user in collabStore.users"
                :key="user.id"
                :disabled="!canAssignUsersToTask"
                :active="usersIdMap[user.id]"
                :icon="mdiAt"
                :text="user.email"
                @click="toggleUsers(user.id)"
            />
        </div>
        <v-autocomplete
            v-else
            v-model="model"
            :loading="loading"
            :disabled="loading"
            :items="collabStore.users"
            :placeholder="t('msg.assignUsers')"
            :readonly="!canAssignUsersToTask"
            class="rad10-v-field pa-0"
            chips
            hide-details
            multiple
            variant="solo"
            item-title="email"
            item-value="id"
            @update:focused="updateAssignee"
        >
            <template #prepend-inner>
                <div class="flex items-start pt-4 h-full">
                    <v-icon>
                        {{ mdiAccountBoxMultipleOutline }}
                    </v-icon>
                </div>
            </template>
        </v-autocomplete>
    </div>
</template>
<script setup lang="ts">
import { mdiAccountBoxMultipleOutline, mdiAt } from '@mdi/js';
import { computed, ref } from 'vue';
import TChip from '@/components/tv-ui/TChip.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useTasksStore } from '@/stores/tasks.store';
import type { CollaborationUsers } from '@/types/collaboration.types';
import type { TaskItem } from '@/types/tasks.types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ task: TaskItem }>();
const collabStore = useCollaborationStore();
const goalListStore = useGoalListsStore();
const tasksStore = useTasksStore();
const { canAssignUsersToTask, canViewAssignedUsersToTask } = useGoalPermissions();
const { t } = useI18n();
const model = ref<CollaborationUsers[number]['id'][]>(props.task.assignedUsers);
const loading = ref(true);
let oldVal: CollaborationUsers[number]['id'][] = [];
//FIXME double callof this function in TasksFilters which init earlyer
collabStore.fetchCollaborationUsersForGoal(goalListStore.currentGoalId);

const usersIdMap = computed(() =>
    model.value.reduce(
        (acc, id) => {
            acc[id] = true;
            return acc;
        },
        {} as Record<CollaborationUsers[number]['id'], true>
    )
);

async function updateAssignee(focused: boolean) {
    if (!focused) {
        if (JSON.stringify(oldVal.sort()) !== JSON.stringify(model.value.sort())) {
            loading.value = true;
            await tasksStore.updateTaskAssignee({ taskId: props.task.id, userIds: model.value }).catch(() => {
                alert('Error updating assignee. Please try updating again.');
            });
            oldVal = [...model.value];
            loading.value = false;
        }
    }
}

const toggleUsers = (id: CollaborationUsers[number]['id']) => {
    if (model.value.includes(id)) {
        model.value = model.value.filter((i) => i !== id);
    } else {
        model.value.push(id);
    }
    updateAssignee(false);
};
</script>
