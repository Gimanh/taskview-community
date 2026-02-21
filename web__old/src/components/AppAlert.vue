<template>
    <!-- eslint-disable vue/require-explicit-emits -->
    <v-dialog
        :model-value="modelValue"
        @after-leave="$emit('update:modelValue', false)"
    >
        <v-card>
            <v-card-text>
                <v-alert
                    :title="title"
                    :type="type"
                >
                    {{ message }}
                </v-alert>
            </v-card-text>
            <v-divider />
            <v-card-actions v-if="showActions">
                <v-spacer />
                <v-btn @click="$emit('update:modelValue', false)">
                    {{ $t('msg.ok') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    modelValue: boolean;
    message: string;
    title: string;
    type: 'success' | 'info' | 'warning' | 'error';
    showActions?: boolean;
}>();

const $t = useI18n().t;
</script>
