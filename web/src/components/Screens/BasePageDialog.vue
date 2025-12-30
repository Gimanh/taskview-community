<template>
    <v-dialog
        v-model="dialog"
        :fullscreen="isMobile"
        :width="isMobile ? undefined : DIALOG_WIDTH"
        :height="isMobile ? '100%' : DIALOG_DESKTOP_HEIGHT"
        scrollable
        transition="slide-x-reverse-transition"
        v-bind="$attrs"
    >
        <template #activator="{ props: activatorProps }">
            <slot
                name="activator"
                v-bind="activatorProps"
            />
        </template>
        <v-card
            :class="isMobile ? undefined : 'rad10'"
            style="background: rgb(var(--v-theme-background))"
        >
            <v-toolbar v-if="showHeader">
                <v-fab
                    v-if="showBackBtn"
                    absolute
                    :location="('center start') as 'top'"
                    icon
                    variant="text"
                    @click="$emit('back')"
                >
                    <v-icon>
                        {{ mdiArrowLeft }}
                    </v-icon>
                </v-fab>

                <span class="tv-text-h3 w100 d-flex justify-center align-center">
                    <slot name="header" />
                </span>
            </v-toolbar>

            <v-card-text class="pa-0">
                <slot />
            </v-card-text>

            <v-card-actions v-if="!hideActions">
                <slot name="actions" />
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { computed } from 'vue';
import { useMobile } from '@/composition/useMobile';
import { DIALOG_DESKTOP_HEIGHT, DIALOG_WIDTH } from '@/types/base-screen.types';

const props = withDefaults(
    defineProps<{ modelValue?: boolean; showHeader?: boolean; showBackBtn?: boolean; hideActions?: boolean }>(),
    {
        showHeader: true,
        showBackBtn: true,
        hideActions: false,
    }
);

const emits = defineEmits(['back', 'update:modelValue']);
const mobile = useMobile();

const isMobile = computed(() => mobile.isMobile.value);
const dialog = computed({
    get() {
        return props.modelValue;
    },
    set(v) {
        emits('update:modelValue', v);
    },
});
</script>
