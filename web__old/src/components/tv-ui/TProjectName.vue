<template>
    <TChipShape 
        class="flex items-center"
    >
        <VIcon
            :icon="mdiFolderOutline"
            size="16"
        />
        <slot />
    </TChipShape>
</template>

<script setup lang="ts">
import { mdiFolderOutline } from '@mdi/js';
import TChipShape from '@/components/tv-ui/TChipShape.vue';
</script>