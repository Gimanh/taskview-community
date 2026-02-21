<template>
    <v-row class="ma-0 pa-0 tv-row-height">
        <v-col
            v-show="canShowColumn"
            md="4"
            class="pt-0 pa-0 pb-5"
        >
            <ContextActions
                :actions="actions"
                :show-menu="dialogStatus"
                :activator="menuActivator"
                @menu-closed="hideMenu"
                @delete-list="showDeleteList"
                @edit-list="showEditList"
                @archive-goal-list="showArchiveDialog = true"
            />

            <FormDelete
                v-model="showArchiveDialog"
                :title="t('msg.archiving')"
                :text="selectedList?.archive === 0 ? t('msg.archiveGoal') : t('msg.unarchiveGoal')"
                @cancel="showArchiveDialog = false"
                @ok="toggleListArchive"
            />

            <FormDelete
                v-model="showDeleteDialog"
                :title="deleteDialogTitle"
                :text="t('msg.areYouWantDeleteRecord')"
                @cancel="cancelDeletion"
                @ok="deleteSelectedList"
            />

            <GoalListEdit
                v-if="showEditDialog"
                v-model="showEditDialog"
                :list="selectedList"
                @cencel="cancelEditGoal"
            />

            <div
                v-if="canViewLists"
                class="d-flex flex-column ga-2 pl-3 pr-3 pt-4"
                style="position: relative"
            >
                <v-progress-linear
                    v-if="storage.loading"
                    absolute
                    color="green"
                    indeterminate
                />
                <GoalListAdd
                    v-if="!isMobile"
                    :goal-id="goalId"
                    class="tv-add-list-input"
                    style="position: sticky; top: 18px; z-index: 2"
                />
                <GoalListItem
                    v-for="list in lists"
                    :key="list.id"
                    :list="list"
                    @show-actions="showActions"
                />

                <GoalListArchived @show-actions="showActions" />
            </div>
        </v-col>
        <v-col
            v-show="canShowTasksColumn"
            class="tv-task-column pa-0"
        >
            <Suspense>
                <router-view />
            </Suspense>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import {
    mdiArchiveArrowDownOutline,
    mdiArchiveArrowUpOutline,
    mdiCancel,
    mdiDeleteOutline,
    mdiPencilOutline,
} from '@mdi/js';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { ContextActions } from '@/components/ContextActions';
import { FormDelete } from '@/components/FormDelete';
import { GoalListAdd } from '@/components/GoalLists/components/GoalListAdd';
import GoalListArchived from '@/components/GoalLists/components/GoalListArchived.vue';
import { GoalListEdit } from '@/components/GoalLists/components/GoalListEdit';
import { GoalListItem } from '@/components/GoalLists/components/GoalListItem';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import type { GoalListEventMoreMenu } from '@/types/goal-lists.types';
import { type GoalActionsItems } from '@/types/goals.types';

const storage = useGoalListsStore();
const display = useDisplay();
const { canViewLists, canDeleteList, canEditList } = useGoalPermissions();
const route = useRoute();
const { t } = useI18n();

const dialogStatus = ref(false);
const menuActivator = ref<HTMLElement>();
const showDeleteDialog = ref(false);
const showEditDialog = ref(false);
const selectedList = ref<GoalListEventMoreMenu['list']>();
const showArchiveDialog = ref(false);

const goalId = computed(() => +route.params.goalId);
const lists = computed(() => storage.lists.filter((list) => list.archive === 0));

const actions = computed<GoalActionsItems>(() => {
    const result: GoalActionsItems = [];

    if (canDeleteList.value) {
        result.push({ id: 2, name: t('msg.delete'), eventName: 'deleteList', icon: mdiDeleteOutline });
    }

    if (canEditList.value) {
        result.push(
            { id: 1, name: t('msg.edit'), eventName: 'editList', icon: mdiPencilOutline },
            {
                id: 3,
                name: selectedList.value?.archive === 0 ? t('msg.archiveGoal') : t('msg.unarchiveGoal'),
                eventName: 'archiveGoalList',
                icon: selectedList.value?.archive === 0 ? mdiArchiveArrowDownOutline : mdiArchiveArrowUpOutline,
            }
        );
    }

    if (result.length === 0) {
        result.push({
            id: -1,
            name: t('msg.noActionAvailable'),
            eventName: 'noItems',
            icon: mdiCancel,
            disabled: true,
        });
    }
    return result;
});

const deleteDialogTitle = computed(() => `${t('msg.deletion')} (${selectedList.value?.name})`);

const canShowColumn = computed(() => {
    if ((display.sm.value || display.xs.value) && route.name === 'goal-list-tasks') {
        return false;
    }
    return true;
});

const canShowTasksColumn = computed(() => {
    if ((display.sm || display.xs) && route.name !== 'goal-list-tasks') {
        return false;
    }
    return true;
});

const isMobile = computed(() => display.sm.value || display.xs.value);

watch(
    () => route.params.goalId as string | undefined,
    (value?: string, oldValue?: string) => {
        if (value !== oldValue) {
            storage.fetchLists(+goalId.value);
        }
    },
    { immediate: true }
);

function showActions(event: GoalListEventMoreMenu) {
    selectedList.value = event.list;
    menuActivator.value = event.activator;

    setTimeout(() => {
        showMenu();
    }, 150);
}

function showMenu() {
    dialogStatus.value = true;
}

function hideMenu() {
    dialogStatus.value = false;
}

function showDeleteList() {
    showDeleteDialog.value = true;
}

function showEditList() {
    showEditDialog.value = true;
}

function cancelDeletion() {
    showDeleteDialog.value = false;
}

function deleteSelectedList() {
    if (selectedList.value) {
        storage.deleteList(selectedList.value.id);
    }
}

function cancelEditGoal() {
    showEditDialog.value = false;
}

function toggleListArchive() {
    if (selectedList.value) {
        storage.updateList({
            id: selectedList.value.id,
            archive: selectedList.value.archive === 0 ? 1 : 0,
        });
    }
}
</script>
