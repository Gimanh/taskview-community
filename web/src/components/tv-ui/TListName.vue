<template>
    <TChipShape
        class="flex items-center"
    >
        <VIcon
            :icon="mdiFormatListBulletedType"
            size="16"
        />
        <slot />
    </TChipShape>
</template>

<script setup lang="ts">
import { mdiFormatListBulletedType } from '@mdi/js';
import TChipShape from '@/components/tv-ui/TChipShape.vue';
</script>