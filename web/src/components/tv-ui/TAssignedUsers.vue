<template>
    <TChipShape class="max-w-full flex flex-wrap gap-1">
        <span
            v-for="user in props.users"
            :key="user"
            class="truncate"
        >
            <VIcon
                :icon="mdiAt"
                size="16"
            />{{ user }}
        </span>
    </TChipShape>
</template>

<script setup lang="ts">
import { mdiAt } from '@mdi/js';
import TChipShape from '@/components/tv-ui/TChipShape.vue';

const props = defineProps<{
    users: string[];
}>();
</script>