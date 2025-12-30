<template>
    <BasePageDialog
        v-model="dialog"
        :show-header="!isMobile"
        :show-back-btn="false"
        
        :height="!isMobile ? 'auto' : undefined "
        @back="$emit('close')"
        @keydown.enter="addTask"
    >
        <template #activator="activatorProps">
            <slot
                name="activator"
                v-bind="activatorProps"
            />
        </template>
        <template #header>
            <div class="tv-text-h3 txt-center">
                {{ title || t('msg.addTask') }}
            </div>
        </template>

        <div
            class="d-flex align-center pa-4"
        >
            <div
                class="w-full flex flex-col gap-4"
            >
                <!-- TODO: CHECK THIS FOR MOBILE DO WE NEED THIS -->
                <div
                    class="block md:hidden tv-text-h3 mb-9 txt-center"
                >
                    {{ title || t('msg.addTask') }}
                </div>
                <v-text-field
                    v-model="taskName"
                    :label="t('msg.task')"
                    :placeholder="t('msg.description')"
                    :rules="rules"
                    autofocus
                    color="primary"
                    variant="solo"
                    hide-details
                    spellcheck="false"
                    class="h-14 text-base rad10-v-field"
                />
                <TPriority
                    v-if="canSetPriority"
                    v-model="priorityModel"
                    :can-edit-task-priority="true"
                />

                <div class="flex gap-2 flex-wrap shadow-md p-3 rounded-tv10 bg-task-item-bg">
                    <VIcon :icon="ICON_PROJECT.icon" />
                    <TChip
                        v-for="goal in goals"
                        :key="goal.id"
                        :icon="mdiRadioboxMarked"
                        :active="goalModel === goal.id"
                        :text="goal.name"
                        @click="goalModel = goal.id"
                    />
                </div>

                <div v-if="upcomingTask">
                    <div
                        class="flex items-center gap-2 cursor-pointer"
                        @click.stop.prevent="useRangeModel = !useRangeModel"
                    >
                        <TvCheckbox
                            v-model="useRangeModel"
                        /> 
                        {{ t('msg.useRange') }}
                    </div>
                    <VDatePicker
                        v-model="taskDatesModel"
                        class="w-full"
                        :multiple="useRangeModel ? 'range' : undefined"
                        hide-header
                        show-adjacent-months
                        :min="new Date()"
                        :hide-weekdays="false"
                        first-day-of-week="1"
                    />
                </div>
            </div>
        </div>

        <template #actions>
            <v-btn
                variant="text"
                color="secondary"
                class="flex-grow h-14 text-base rad10 fw700"
                @click="$emit('close')"
            >
                {{ t('msg.cancel') }}
            </v-btn>
            <v-btn
                variant="text"
                color="primary"
                elevation="0"
                class="flex-grow h-14 text-base rad10 fw700"
                :disabled="!taskName || !goalModel"
                @click="addTask"
            >
                {{ t('msg.add') }}
            </v-btn>
        </template>
    </BasePageDialog>
</template>

<script setup lang="ts">
import { mdiRadioboxMarked } from '@mdi/js';
import { useDateFormat } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TvCheckbox from '@/components/Common/TvCheckbox.vue';
import BasePageDialog from '@/components/Screens/BasePageDialog.vue';
import TChip from '@/components/tv-ui/TChip.vue';
import TPriority from '@/components/tv-ui/TPriority.vue';
import { useMobile } from '@/composition/useMobile';
import { $ls } from '@/plugins/axios';
import { useBaseScreenStore } from '@/stores/base-screen.store';
import { useGoalsStore } from '@/stores/goals.store';
import { useTasksStore } from '@/stores/tasks.store';
import { ICON_PROJECT } from '@/types/base-screen.types';
import { AllGoalPermissions } from '@/types/goals.types';
import { ALL_TASKS_LIST_ID, type TaskItem } from '@/types/tasks.types';

const props = defineProps<{
    taskName?: string;
    modelValue: boolean;
    title?: string;
    upcomingTask?: boolean;
    // when true, we don't need to show dates, we just add task to the project without dates
    noDates?: boolean;
}>();
const emits = defineEmits(['added', 'close', 'update:modelValue']);

const { t } = useI18n();
const taskName = ref(props.taskName ? props.taskName : '');
const goalModel = ref<number | null>(null);
const rules = computed(() => [(v: string) => !!v.trim() || t('msg.requiredField')]);
const baseScreenStore = useBaseScreenStore();
const tasksStore = useTasksStore();
const goalsStore = useGoalsStore();
const mobile = useMobile();

const taskDatesModel = ref<Date | Date[]>(props.upcomingTask ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date());
const priorityModel = ref<TaskItem['priorityId']>(1);
const useRangeModel = ref(false);

const startDate = computed(() => {
    if (props.upcomingTask) {
        if (Array.isArray(taskDatesModel.value)) {
            return useDateFormat(taskDatesModel.value[0], 'YYYY-MM-DD').value;
        }
    }
    return null;
});

const endDate = computed(() => {
    if (props.noDates) return null;

    if (props.upcomingTask) {
        if (Array.isArray(taskDatesModel.value)) {
            return useDateFormat(taskDatesModel.value[taskDatesModel.value.length - 1], 'YYYY-MM-DD').value;
        }
    }
    return useDateFormat(
        Array.isArray(taskDatesModel.value) ? taskDatesModel.value[0] : taskDatesModel.value,
        'YYYY-MM-DD'
    ).value;
});

const goals = computed(() =>
    goalsStore.goals.filter((g) => g.permissions[AllGoalPermissions.COMPONENT_CAN_ADD_TASKS] && !g.archive)
);

const canSetPriority = computed(
    () => goalsStore.goals.find((g) => g.id === goalModel.value)?.permissions[AllGoalPermissions.TASK_CAN_EDIT_PRIORITY]
);

const dialog = computed({
    get() {
        return props.modelValue;
    },
    set(v) {
        emits('update:modelValue', v);
    },
});

const isMobile = computed(() => mobile.isMobile.value);

watch(
    () => dialog.value,
    () => {
        if (props.taskName) taskName.value = props.taskName;
    }
);

const getEarlySelectedProjectId = async () => await $ls.getValue('addTaskDefaultProjectId');

const setEarlySelectedProjectId = (id: number | null) => $ls.setValue('addTaskDefaultProjectId', id?.toString() || '');

async function addTask() {
    if (!taskName.value) return;

    const newTask = await tasksStore.addTask({
        goalId: goalModel.value!,
        goalListId: ALL_TASKS_LIST_ID,
        description: taskName.value,
        startDate: startDate.value,
        endDate: endDate.value,
        priorityId: priorityModel.value,
    });

    if (newTask) {
        await setEarlySelectedProjectId(goalModel.value);
        //FIXME need to fetch task for store.tasks by id
        await baseScreenStore.fetchAllState();
        resetForm();
        emits('added');
    }
}

const resetForm = () => {
    taskName.value = '';
    taskDatesModel.value = props.upcomingTask ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date();
    useRangeModel.value = false;
};

const resetToFirstDate = () => {
    if (Array.isArray(taskDatesModel.value)) {
        taskDatesModel.value = taskDatesModel.value[taskDatesModel.value.length - 1];
    }
};

const fillDatesArray = () => {
    if (Array.isArray(taskDatesModel.value)) {
        taskDatesModel.value = [new Date(taskDatesModel.value[0]), new Date(taskDatesModel.value[0])];
    } else {
        taskDatesModel.value = [new Date(taskDatesModel.value), new Date(taskDatesModel.value)];
    }
};

watch(
    () => useRangeModel.value,
    (value) => {
        if (!value) {
            resetToFirstDate();
        } else {
            fillDatesArray();
        }
    }
);

onMounted(async () => {
    const earlySelectedProjectId = await getEarlySelectedProjectId();
    if (earlySelectedProjectId) {
        if (goalsStore.goalMap.get(Number(earlySelectedProjectId))) {
            goalModel.value = Number(earlySelectedProjectId);
        } else {
            setEarlySelectedProjectId(null);
        }
    } else {
        setEarlySelectedProjectId(goals.value[0]?.id || null);
    }

    goalModel.value = Number(await getEarlySelectedProjectId());
});
</script>
