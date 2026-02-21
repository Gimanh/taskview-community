<template>
    <v-card class="item-with-avatar rad10 d-flex flex-column pb-2 pt-2 pl-3 pr-3">
        <div
            class="d-flex align-center ga-2"
            @click="$emit('toggleActive')"
        >
            <slot name="avatar">
                <v-avatar
                    :text="avatar"
                    :color="avatarColor"
                />
            </slot>
            <div class="item-with-avatar__title flex-grow-1 txt-only-two-lines txt-subtitle-2 txt-opacity">
                {{ title }}
            </div>
            <div>
                <slot name="action" />
                <v-btn
                    :icon="isActive ? appendIconPassive : appendIconActive"
                    size="small"
                    variant="text"
                />
            </div>
        </div>

        <div
            v-if="isActive"
            class="item-with-avatar__container"
        >
            <slot />
        </div>
    </v-card>
</template>
<script setup lang="ts">
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';

withDefaults(
    defineProps<{
        title: string;
        avatar?: string;
        avatarColor?: string;
        appendIconActive?: string;
        appendIconPassive?: string;
        isActive?: boolean;
    }>(),
    {
        appendIconPassive: mdiChevronUp,
        appendIconActive: mdiChevronDown,
        avatar: '',
        avatarColor: '',
    }
);

defineEmits(['toggleActive']);
</script>
