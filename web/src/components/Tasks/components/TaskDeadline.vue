<template>
    <v-card
        class="rad10 pl-3 d-flex flex-wrap py-3 gap-5"
        min-height="56px"
        style="z-index: 1"
    >
        <div class="flex flex-row align-center min-w-full">
            <div class="d-flex align-center">
                <v-icon
                    :icon="mdiCalendarClock"
                    color="var(--nav-item-icon-color)"
                />
            </div>
            <div class="d-flex align-center pl-3 ga-2">
                <TaskDate
                    ref="startDateRef"
                    :task="task"
                    :status="'start'"
                    :label="t('msg.startDate')"
                />
                <TaskDate
                    ref="endDateRef"
                    :task="task"
                    :status="'end'"
                    :label="t('msg.endDate')"
                />
            </div>
        </div>

        <div class="flex flex-wrap align-center gap-2">
            <v-chip
                :disabled="loading || !canEditTaskDeadline"
                size="small"
                class="rounded"
                @click="updateDates('today')"
            >
                {{ t('msg.today') }}
            </v-chip>
            <v-chip
                :disabled="loading || !canEditTaskDeadline"
                size="small"
                class="rounded"
                @click="updateDates('tomorrow')"
            >
                {{ t('msg.tomorrow') }}
            </v-chip>
            <v-chip
                :disabled="loading || !canEditTaskDeadline"
                size="small"
                class="rounded"
                @click="updateDates('yesterday')"
            >
                {{ t('msg.yesterday') }}
            </v-chip>
        </div>
    </v-card>
</template>
<script setup lang="ts">
import { mdiCalendarClock } from '@mdi/js';
import { useDateFormat } from '@vueuse/core';
import { computed, ref } from 'vue';
import TaskDate from '@/components/Tasks/components/TaskDate.vue';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useI18n } from 'vue-i18n';

const { canEditTaskDeadline } = useGoalPermissions();
const props = defineProps<{ task: TaskItem }>();
const { t } = useI18n();
const tasksStore = useTasksStore();
const startDateRef = ref();
const endDateRef = ref();
const loading = computed(() =>
    startDateRef.value && endDateRef.value ? startDateRef.value.loading || endDateRef.value.loading : false
);

function getDateForButton(type: 'today' | 'tomorrow' | 'yesterday') {
    switch (type) {
        case 'today':
            return useDateFormat(new Date(), 'YYYY-MM-DD').value;
        case 'tomorrow':
            return useDateFormat(new Date().setDate(new Date().getDate() + 1), 'YYYY-MM-DD').value;
        case 'yesterday':
            return useDateFormat(new Date().setDate(new Date().getDate() - 1), 'YYYY-MM-DD').value;
        default:
            return '';
    }
}

async function updateDates(type: 'today' | 'tomorrow' | 'yesterday') {
    const date = getDateForButton(type);

    startDateRef.value.loading = true;
    endDateRef.value.loading = true;

    await Promise.allSettled([
        tasksStore.saveDateForTask({
            id: props.task.id,
            startDate: date,
        }),
        tasksStore.saveDateForTask({
            id: props.task.id,
            endDate: date,
        }),
    ]).finally(() => {
        startDateRef.value.loading = false;
        endDateRef.value.loading = false;
    });
}
</script>

<style lang="scss">
.tv-deadline {
    .dp__main {
        width: fit-content;
    }
}
</style>
