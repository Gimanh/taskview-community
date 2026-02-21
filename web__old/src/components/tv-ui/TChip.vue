<template>
    <TChipShape
        
        :class="{ 
            'font-semibold': props.active, 
            'dark:text-gray-300 dark:bg-zinc-700 bg-stone-200': props.active,
            'opacity-50 cursor-not-allowed pointer-events-none': props.disabled
        }"
        class="cursor-pointer truncate max-w-full flex items-center"
    >
        <slot name="icon">
            <VIcon
                v-if="props.icon"
                :icon="props.icon"
                :class="{ 'text-green-500': props.active }"
            />
        </slot>

        <span class="truncate">
            <slot>
                {{ props.text }}
            </slot>
        </span>
    </TChipShape>
</template>

<script setup lang="ts">
import TChipShape from '@/components/tv-ui/TChipShape.vue';

const props = defineProps<{
    active?: boolean;
    icon?: string;
    text?: string;
    disabled?: boolean;
}>();
</script>