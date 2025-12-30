<template>
    <v-dialog
        v-model="datetimeDialog"
        persistent
        fullscreen
    >
        <template #activator="{ props: activatorProps }">
            <slot
                name="activator"
                v-bind="{ props: activatorProps }"
            >
                <v-text-field
                    :value="''"
                    readonly
                    v-bind="activatorProps"
                />
            </slot>
        </template>
        <div class="d-flex justify-center align-center flex-grow-1 flex-column">
            <v-card
                class="t-datetime-picker white"
                width="fit-content"
                height="fit-content"
            >
                <v-overlay
                    v-if="loading"
                    v-model="overlay"
                    class="align-center justify-center"
                    persistent
                    contained
                >
                    <v-progress-circular
                        color="primary"
                        size="64"
                        indeterminate
                    />
                </v-overlay>
                <v-toolbar
                    height="46"
                    flat
                >
                    <v-btn-toggle
                        v-model="tab"
                        class="w100"
                    >
                        <v-btn
                            class="flex-grow-1"
                            :color="tab === 0 ? 'primary' : undefined"
                            @click="tab = 0"
                        >
                            <v-icon :icon="mdiCalendar" />
                        </v-btn>
                        <v-btn
                            class="flex-grow-1"
                            :color="tab === 1 ? 'primary' : undefined"
                            @click="tab = 1"
                        >
                            <v-icon :icon="mdiClock" />
                        </v-btn>
                    </v-btn-toggle>
                </v-toolbar>

                <div v-if="tab === 0">
                    <v-date-picker
                        v-model="date"
                        :min="min"
                        :max="max"
                        class="rounded-0"
                        full-width
                        :first-day-of-week="1"
                        @update:model-value="updateModel"
                    />
                </div>
                <div v-if="tab === 1">
                    <VTimePicker
                        v-model="time"
                        :min="minTime as (string | undefined)"
                        :max="maxTime as (string | undefined)"
                        format="24hr"
                        class="rounded-0"
                        @update:model-value="timeChanged"
                    />
                </div>
                <v-card-actions>
                    <v-btn
                        v-if="tab === 0"
                        :prepend-icon="mdiDeleteOutline"
                        @click="deleteDate"
                    >
                        {{
                            $t('task.date')
                        }}
                    </v-btn>
                    <v-btn
                        v-if="tab === 1"
                        :prepend-icon="mdiDeleteOutline"
                        @click="deleteTime"
                    >
                        {{
                            $t('task.time')
                        }}
                    </v-btn>
                    <v-spacer />
                    <v-btn @click="datetimeDialog = false">
                        {{ $t('msg.close') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </div>
    </v-dialog>
</template>

<script setup lang="ts">
import { mdiCalendar, mdiClock, mdiDeleteOutline } from '@mdi/js';
import { ref, watchEffect } from 'vue';
import { VTimePicker } from 'vuetify/labs/VTimePicker';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    modelValue: {
        date?: string | null;
        time?: string | null;
    };
    min?: Date; 
    max?: Date; 
    minTime?: string | null;
    maxTime?: string | null;
    loading?: boolean;
}>();

console.log(props);
const emits = defineEmits(['update:modelValue', 'saveData']);

defineExpose({
    closeDialog,
});

const $t = useI18n().t;
const date = ref<Date | null>(props.modelValue.date ? new Date(props.modelValue.date) : null);
const time = ref(props.modelValue.time);

watchEffect(() => {
    date.value = props.modelValue.date ? new Date(props.modelValue.date) : null;
    time.value = props.modelValue.time;
});

const tab = ref(0);
const datetimeDialog = ref(false);
const overlay = ref(true);

function closeDialog() {
    datetimeDialog.value = false;
}
function deleteDate() {
    date.value = null;
    time.value = null;
    updateModel();
}

function deleteTime() {
    time.value = null;
    updateModel();
}

function updateModel() {
    emits('update:modelValue', { date: date.value, time: time.value });
}

function timeChanged() {
    if (date.value) {
        updateModel();
    }
}
</script>
