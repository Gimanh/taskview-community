<template>
    <v-bottom-sheet
        v-model="sheet"
        location-strategy="connected"
    >
        <template #activator="{ props }">
            <v-btn
                v-bind="props"
                icon
                size="small"
                elevation="0"
            >
                <v-icon>
                    {{ mdiDotsVertical }}
                </v-icon>
            </v-btn>
        </template>

        <v-card>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    icon
                    size="small"
                    elevation="0"
                    @click="$emit('update:modelValue', 'add'), (sheet = false)"
                >
                    <v-icon size="large">
                        {{ mdiPlus }}
                    </v-icon>
                </v-btn>
                <v-btn
                    icon
                    size="small"
                    elevation="0"
                    @click="$emit('update:modelValue', 'search'), (sheet = false)"
                >
                    <v-icon size="large">
                        {{ mdiMagnify }}
                    </v-icon>
                </v-btn>
                <ToggleCompletedTasks @click="sheet = false" />
            </v-card-actions>
        </v-card>
    </v-bottom-sheet>
</template>

<script setup lang="ts">
import { mdiDotsVertical, mdiMagnify, mdiPlus } from '@mdi/js';
import { ref } from 'vue';
import ToggleCompletedTasks from '@/components/Atoms/ToggleCompletedTasks.vue';

export type MobileHeaderTasksActionsModelType = 'add' | 'search';

defineEmits<(e: 'update:modelValue', id: MobileHeaderTasksActionsModelType) => void>();

withDefaults(defineProps<{ modelValue: MobileHeaderTasksActionsModelType }>(), { modelValue: 'add' });

const sheet = ref(false);
</script>
