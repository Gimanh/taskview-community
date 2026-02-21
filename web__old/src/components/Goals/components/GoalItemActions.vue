<template>
    <div>
        <v-menu location="bottom">
            <template #activator="{ props: activatorProps }">
                <v-btn
                    v-bind="activatorProps"
                    :size="'x-small'"
                    elevation="0"
                    class="txt-opacity"
                    icon
                >
                    <v-icon>
                        {{ mdiDotsHorizontal }}
                    </v-icon>
                </v-btn>
            </template>
            <v-list>
                <v-list-item
                    v-for="item in actions"
                    :key="item.id"
                    :value="item.name"
                    :disabled="item.disabled"
                    @click="handleSelected(item.eventName)"
                >
                    <template
                        v-if="item.icon"
                        #append
                    >
                        <v-icon :class="item.id === 2 ? 'text-red-500' : undefined">
                            {{ item.icon }}
                        </v-icon>
                    </template>
                    <v-list-item-title :class="item.id === 2 ? 'text-red-500' : undefined">
                        {{ item.name }}
                    </v-list-item-title>
                </v-list-item>
            </v-list>
        </v-menu>

        <FormDelete
            v-if="activeDialog == 'archiveGoal'"
            v-model="dialogModel"
            :title="t('msg.archiving')"
            :text="goal.archive === 0 ? t('msg.archiveGoal') : t('msg.unarchiveGoal')"
            @cancel="activeDialog = ''"
            @ok="toggleArchiveGoal"
        />

        <FormDelete
            v-if="activeDialog == 'deleteGoal'"
            v-model="dialogModel"
            :title="`${t('msg.deletion')} (${goal.name})`"
            :text="t('msg.areYouWantDeleteRecord')"
            @cancel="activeDialog = ''"
            @ok="deleteSelectedGoal"
        />

        <GoalEdit
            v-if="activeDialog === 'editGoal'"
            v-model="dialogModel"
            :goal="goal"
            @cancel="activeDialog = ''"
        />
    </div>
</template>
<script setup lang="ts">
import { mdiDeleteOutline, mdiDotsHorizontal } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import FormDelete from '@/components/FormDelete/FormDelete.vue';
import GoalEdit from '@/components/Goals/components/GoalEdit/GoalEdit.vue';
import { APP_ICONS } from '@/helpers/app-helper';
import { useGoalsStore } from '@/stores/goals.store';
import { AllGoalPermissions, type GoalActionsItems, type GoalActionsItemsEvents } from '@/types/goals.types';
import { useGoalPermissions } from '@/composition/useGoalPermissions';

const props = defineProps<{ goal: GoalItem }>();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const storage = useGoalsStore();
const activeDialog = ref<GoalActionsItemsEvents | ''>('');
const dialogModel = ref(true);
const { canViewGraph } = useGoalPermissions();

watch(
    () => activeDialog.value,
    (val: string) => {
        dialogModel.value = !!val;
    }
);

const actions = computed<GoalActionsItems>(() => {
    const result: GoalActionsItems = [];

    if(canViewGraph.value){
        result.push({
            id: 5,
            name: t('msg.graph'),
            eventName: 'graphView',
            icon: APP_ICONS.graph,
        });
    }

    if (props.goal?.permissions[AllGoalPermissions.KANBAN_CAN_VIEW] 
        || props.goal?.permissions[AllGoalPermissions.KANBAN_CAN_MANAGE]) {
        result.push({
            id: 5,
            name: t('msg.kanban'),
            eventName: 'kanbanView',
            icon: APP_ICONS.kanban,
        });
    }

    if (props.goal?.permissions[AllGoalPermissions.GOAL_CAN_MANAGE_USERS]) {
        result.push({
            id: 4,
            name: t('msg.collaboration'),
            eventName: 'callCollaboration',
            icon: APP_ICONS.collaboration,
        });
    }

    if (props.goal?.permissions[AllGoalPermissions.GOAL_CAN_EDIT]) {
        result.push(
            { id: 1, name: t('msg.edit'), eventName: 'editGoal', icon: APP_ICONS.edit },
            {
                id: 3,
                name: props.goal?.archive === 0 ? t('msg.archiveGoal') : t('msg.unarchiveGoal'),
                eventName: 'archiveGoal',
                icon: props.goal?.archive === 0 ? APP_ICONS.archive : APP_ICONS.unArchive,
            }
        );
    }

    if (result.length === 0) {
        result.push({
            id: -1,
            name: t('msg.noActionAvailable'),
            eventName: 'noItems',
            icon: APP_ICONS.noItems,
            disabled: true,
        });
    }

    if (props.goal?.permissions[AllGoalPermissions.GOAL_CAN_DELETE]) {
        result.push({ id: 2, name: t('msg.delete'), eventName: 'deleteGoal', icon: mdiDeleteOutline });
    }

    return result;
});

function handleSelected(eventName: GoalActionsItemsEvents | '') {
    switch (eventName) {
        case 'callCollaboration':
            router.push({
                name: 'project-collaboration-page',
                params: { goalId: props.goal.id },
            });
            break;
        case 'kanbanView':
            router.push({
                name: 'kanban',
                params: { goalId: props.goal.id },
            });
            break;
        case 'graphView':
            router.push({
                name: 'user-graph',
                params: { goalId: props.goal.id },
            });
            break;
        default:
            activeDialog.value = eventName;
            dialogModel.value = true;
    }
}

async function toggleArchiveGoal() {
    await storage.updateGoal({
        id: props.goal.id,
        archive: props.goal.archive > 0 ? 0 : 1,
    });
}

async function deleteSelectedGoal() {
    await storage.deleteGoal(props.goal.id);

    if (route.params.goalId && +route.params.goalId === props.goal.id) {
        await router.push({ name: 'user' });
    }
}
</script>
