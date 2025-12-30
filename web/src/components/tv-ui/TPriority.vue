<template>
    <v-card
        class="tv-priority rad10 d-flex align-center"
        min-height="56px"
    >
        <v-radio-group
            v-model="model"
            :readonly="!canEditTaskPriority"
            inline
            hide-details
        >
            <v-radio
                :label="$t('priority.low')"
                :value="1"
                color="#38D681"
            >
                <template #label>
                    <v-icon
                        :icon="mdiSignalCellular1"
                        color="#38D681"
                    />
                </template>
            </v-radio>
            <v-radio
                :label="$t('priority.medium')"
                :value="2"
                color="#FF9100"
            >
                <template #label>
                    <v-icon
                        :icon="mdiSignalCellular2"
                        color="#FF9100"
                    />
                </template>
            </v-radio>
            <v-radio
                :label="$t('priority.high')"
                :value="3"
                color="#FF1744"
            >
                <template #label>
                    <v-icon
                        :icon="mdiSignalCellular3"
                        color="#FF1744"
                    />
                </template>
            </v-radio>
        </v-radio-group>
    </v-card>
</template>

<script setup lang="ts">
import { mdiSignalCellular1, mdiSignalCellular2, mdiSignalCellular3 } from '@mdi/js';
import { useI18n } from 'vue-i18n';

defineProps<{
    canEditTaskPriority?: boolean;
}>();

const model = defineModel<number>({ required: true });
const $t = useI18n().t;
</script>