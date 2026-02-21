<template>
    <v-btn
        v-if="isMobile"
        icon
        size="small"
        elevation="0"
        @click="$router.push({ name: 'goal-lists' })"
    >
        <v-icon size="large">
            {{ mdiArrowLeft }}
        </v-icon>
    </v-btn>
</template>
<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { useMobile } from '@/composition/useMobile';

const { isMobile } = useMobile();
</script>
