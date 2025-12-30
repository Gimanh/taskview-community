<template>
    <v-bottom-sheet
        v-if="!isDesktop"
        v-model="isActiveSheet"
        scrollable
    >
        <template #activator="{ props: activatorProps }">
            <v-btn
                v-if="canAccessTaskHistory"
                v-bind="activatorProps"
                :prepend-icon="mdiClipboardTextClockOutline"
                :text="t('msg.editHistory')"
                elevation="1"
                class="rad10 w100 justify-start txt-subtitle-2 tv-history-activator"
                height="56px"
            />
        </template>

        <v-card class="rounded-lg pt-3">
            <v-card-title>
                {{ t('msg.editHistory') }}
            </v-card-title>
            <v-card-text>
                <div v-if="historyStore.history.length === 0">
                    {{ t('msg.noHistory') }}
                </div>

                <div class="d-flex flex-column ga-4">
                    <v-card
                        v-for="item in getChangesAll"
                        :key="item.description"
                        class="rad10"
                    >
                        <v-card-text class="txt-subtitle-2">
                            {{ item.description }}
                        </v-card-text>

                        <v-card-actions class="pt-0 pb-0">
                            <v-spacer />
                            <v-btn
                                v-if="item.historyId && canRecoveryTaskHistory"
                                :prepend-icon="mdiHistory"
                                @click="recoverTaskState(item.historyId, taskId)"
                            >
                                {{ t('msg.regRecover') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="isActiveSheet = false">
                    {{ t('msg.close') }}
                </v-btn>
                <v-spacer />
            </v-card-actions>
        </v-card>
    </v-bottom-sheet>
    <div v-else>
        <v-btn
            v-if="canAccessTaskHistory"
            :prepend-icon="mdiClipboardTextClockOutline"
            :text="t('msg.editHistory')"
            elevation="1"
            class="rad10 w100 justify-start txt-subtitle-2 tv-history-activator"
            height="56px"
            @click="isActiveSheet = !isActiveSheet"
        />

        <div
            v-if="isActiveSheet"
            class="pl-7 pr-7"
        >
            <v-card
                class="rad10 pa-5 mt-5"
                max-height="200px"
                style="overflow-y: auto"
            >
                <v-list v-if="getChangesAll.length > 0">
                    <template
                        v-for="item in getChangesAll"
                        :key="item.description"
                    >
                        <v-list-item :title="item.description">
                            <template #append>
                                <v-btn
                                    v-if="item.historyId && canRecoveryTaskHistory"
                                    :icon="mdiArrowULeftTop"
                                    size="small"
                                    variant="text"
                                    @click="recoverTaskState(item.historyId, taskId)"
                                />
                            </template>
                        </v-list-item>
                        <v-divider />
                    </template>
                </v-list>
                <div v-else>
                    {{ t('msg.noHistory') }}
                </div>
            </v-card>
        </div>
    </div>
</template>
<script setup lang="ts">
import { mdiArrowULeftTop, mdiClipboardTextClockOutline, mdiHistory } from '@mdi/js';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useTaskHistory } from '@/stores/task-history.store';
import type { TaskItem } from '@/types/tasks.types';

type RecHistoryItem = { historyId: number | null; description: string };

const props = defineProps<{
    taskId: TaskItem['id'];
    isDesktop?: boolean;
}>();

const historyStore = useTaskHistory();
const isActiveSheet = ref(false);
const router = useRouter();
const { t } = useI18n();
const { canRecoveryTaskHistory, canAccessTaskHistory } = useGoalPermissions();

watch(isActiveSheet, () => {
    historyStore.fetchHistoryForTask(props.taskId);
});

historyStore.fetchHistoryForTask(props.taskId);

const getChangesAll = computed(() => {
    const history: RecHistoryItem[] = [];
    historyStore.history.reduce((acc, curent, index, arr) => {
        if (index + 1 <= arr.length - 1) {
            acc.push(...getChanges(arr[index + 1], curent));
        }
        return acc;
    }, history as RecHistoryItem[]);
    return history;
});

async function recoverTaskState(historyId: number | null, taskId: TaskItem['id']) {
    if (typeof historyId === 'number') {
        const result = await historyStore.recoverState(historyId, taskId);
        if (result) {
            router.go(0);
        }
    }
}

function getHistoryDescription(fieldName: string, from: string, to: string, historyId: number | null): RecHistoryItem {
    return {
        historyId: historyId,
        description: `${t('history.changed')}·[${t(`history.${fieldName}`)}]:··"${from}"·=>·"${to}"`,
    };
}

function getChanges(t1: TaskItem, t2: TaskItem) {
    const result: RecHistoryItem[] = [];
    if (t1.note !== t2.note) {
        result.push(getHistoryDescription('note', t1.note || '', t2.note || '', t1.historyId));
    }
    if (t1.description !== t2.description) {
        result.push(getHistoryDescription('description', t1.description || '', t2.description || '', t1.historyId));
    }
    if (t1.complete !== t2.complete) {
        result.push(
            getHistoryDescription(
                'complete',
                t1.complete ? t('history.completeTrue') : t('history.completeFalse'),
                t2.complete ? t('history.completeTrue') : t('history.completeFalse'),
                t1.historyId
            )
        );
    }
    if (t1.parentId !== t2.parentId) {
        result.push(
            // @ts-expect-error TODO: fix this
            getHistoryDescription('parentId', t1.parentIdDescription || '', t2.parentIdDescription || '', t1.historyId)
        );
    }
    if (t1.priorityId !== t2.priorityId) {
        result.push(
            getHistoryDescription('priorityId', t1.priorityId.toString(), t2.priorityId.toString(), t1.historyId)
        );
    }
    if (t1.goalListId !== t2.goalListId) {
        result.push(
            getHistoryDescription(
                'goalListId',
                // @ts-expect-error TODO: fix this
                t1.goalListIdDescription || '',
                // @ts-expect-error TODO: fix this
                t2.goalListIdDescription || '',
                t1.historyId
            )
        );
    }
    if (t1.endDate !== t2.endDate) {
        result.push(getHistoryDescription('endDate', t1.endDate || '', t2.endDate || '', t1.historyId));
    }
    if (t1.startDate !== t2.startDate) {
        result.push(getHistoryDescription('startDate', t1.startDate || '', t2.startDate || '', t1.historyId));
    }
    return result;
}
</script>
