<template>
    <div class="d-flex flex-column tv-deadline">
        <AppDateTimePicker
            ref="appDateTimePicker"
            v-model="dateModel"
            :min="minDate"
            :max="maxDate"
            :min-time="minTime"
            :max-time="maxTime"
            :loading="loading"
            @save-data="saveChanges"
        >
            <template #activator="{ props: localProps }">
                <v-chip
                    v-bind="localProps"
                    
                    :disabled="loading || !canEditTaskDeadline"
                    :loading="loading"
                    label
                    elevation="1"
                    @click:close="clearDate"
                >
                    {{ fomatedDate }} 
                    <template #append>
                        <v-icon
                            v-if="dateModel.date"
                            class="ml-1"
                            @click.prevent.stop="clearDate"
                        >
                            {{ mdiClose }}
                        </v-icon>
                    </template>
                </v-chip>
            </template>
        </AppDateTimePicker>
    </div>
</template>
<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { useDateFormat } from '@vueuse/core';
import type { Task } from 'taskview-api';
import { computed, ref, watch } from 'vue';
import AppDateTimePicker from '@/components/AppDateTimePicker.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { delay, getTimeZone } from '@/helpers/app-helper';
import { useTasksStore } from '@/stores/tasks.store';
const { canEditTaskDeadline } = useGoalPermissions();
const props = defineProps<{ task: Task; status: 'start' | 'end'; label: string }>();

const loading = ref(false);

defineExpose({ loading });

const tasksStore = useTasksStore();
const appDateTimePicker = ref<typeof AppDateTimePicker>();

const getCorrectDateAndTimeInCurrentTz = computed(() => {
    let localDate = props.task[`${props.status}Date`];
    let localTime = props.task[`${props.status}Time`];

    if (localDate && localTime) {
        const ld = new Date(`${localDate} ${localTime}`);
        localDate = useDateFormat(ld, 'YYYY-MM-DD').value;
        localTime = useDateFormat(ld, 'HH:mm').value;
    }
    return {
        date: localDate,
        time: localTime,
    };
});

const dateModel = ref({
    date: getCorrectDateAndTimeInCurrentTz.value.date,
    time: getCorrectDateAndTimeInCurrentTz.value.time,
});

watch(
    () => getCorrectDateAndTimeInCurrentTz.value,
    (nV) => {
        dateModel.value.date = nV.date;
        dateModel.value.time = nV.time;
    }
);

const maxTime = computed(() => {
    const endDate = props.task.endDate;
    const endTime = props.task.endTime;

    if (props.status === 'start') {
        if (endDate && endTime && areDatesEqual(props.task.startDate, props.task.endDate)) {
            const ld = new Date(`${endDate} ${endTime}`);
            return useDateFormat(ld, 'HH:mm').value;
        }
    }
    return null;
});

const minTime = computed(() => {
    const startDate = props.task.startDate;
    const startTime = props.task.startTime;

    if (props.status === 'end') {
        if (startDate && startTime && areDatesEqual(props.task.startDate, props.task.endDate)) {
            const ld = new Date(`${startDate} ${startTime}`);
            return useDateFormat(ld, 'HH:mm').value;
        }
    }
    return null;
});

const maxDate = computed(() => {
    if (props.status === 'start') {
        if (props.task.endDate) {
            return new Date(props.task.endDate);
        }
    }
    return undefined;
});

const minDate = computed(() => {
    if (props.status === 'end') {
        if (props.task.startDate) {
            const d = new Date(props.task.startDate);
            d.setDate(d.getDate() - 1);
            return d;
        }
    }
    return undefined;
});

function areDatesEqual(date1?: Task['startDate'], date2?: Task['startDate']) {
    if (!date1 || !date2) {
        return false;
    }
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

const fullDate = computed(() => {
    if (getCorrectDateAndTimeInCurrentTz.value.date) {
        if (getCorrectDateAndTimeInCurrentTz.value.time) {
            return new Date(
                `${getCorrectDateAndTimeInCurrentTz.value.date} ${getCorrectDateAndTimeInCurrentTz.value.time}`
            );
        }
        return new Date(`${getCorrectDateAndTimeInCurrentTz.value.date}`);
    }
    return null;
});

const dateFormatForUi = computed(() => {
    if (getCorrectDateAndTimeInCurrentTz.value.date) {
        if (getCorrectDateAndTimeInCurrentTz.value.time) {
            return 'DD-MM HH:mm';
        }
        return 'DD-MM';
    }
    return '';
});

const fomatedDate = computed(() => {
    if (fullDate.value) {
        return useDateFormat(fullDate.value, dateFormatForUi.value).value.replace('"', '');
    }
    return props.label;
});

async function saveChanges() {
    const val = dateModel.value;
    loading.value = true;

    const data = { ...val };

    data.date = data.date ? useDateFormat(data.date, 'YYYY-MM-DD').value : data.date;
    data.time = data.date && data.time ? data.time : null;

    if (data.time) {
        const sections = data.time.split(':');
        const timeZone = getTimeZone();
        if (sections.length < 3) {
            data.time = `${data.time}:00${timeZone}`;
        } else {
            data.time = `${data.time}${timeZone}`;
        }
    }

    await tasksStore.saveDateForTask({
        id: props.task.id,
        [props.status === 'start' ? 'startTime' : 'endTime']: data.time,
        [props.status === 'start' ? 'startDate' : 'endDate']: data.date,
    });

    await delay(200);
    appDateTimePicker.value?.closeDialog();
    loading.value = false;
}

watch(
    () => dateModel.value,
    async () => {
        await saveChanges();
    }
);

function clearDate() {
    dateModel.value = {
        date: null,
        time: null,
    };
    saveChanges();
}
</script>
